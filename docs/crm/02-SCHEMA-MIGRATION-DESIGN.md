# Schema-First Migration Design — Phase 1a (hygiene) + Phase 1b (RLS/custom-fields) preview

**Status:** Draft for approval · **Date:** 2026-08-15
**Rule:** Design only. No migration in this document is applied until Phase 1a (and separately, Phase 1b) is approved.

---

## Part A — Phase 1a: capturing the schema drift since `0004_complex_whizzer`

### The problem, precisely

`meta/_journal.json` registers migrations `0000` through `0004_complex_whizzer` only. Everything in `apps/api/src/database/schema/*.ts` added since that migration was generated — the CRM telecalling columns (`leads.priority`, `nextFollowUpAt`, `lastDisposition`, `callAttempts`, `registryCin`, `registryStatus`, `registryVerifiedAt`), the `call_disposition`/`call_direction`/`lead_priority` enums, the `lead_candidates` staging table, the Lead Finder MCA-registry fields — was applied to the live database via `drizzle-kit push --force` (or hand-run `deploy/*.sql`), never via `generate`. The journal doesn't know any of it happened.

**Consequence:** `drizzle-kit migrate` run against a *fresh* database today would create a schema missing all of that — a fresh environment and the live production environment are silently different shapes, only reconciled by whoever happens to run `push --force` again by hand.

### The fix

One migration, generated and reviewed as its own step, not folded into any CRM feature migration:

1. Run `drizzle-kit generate` locally against current `schema/*.ts` — this diffs against `meta/0004_snapshot.json` and produces the SQL to go from "0004 state" to "current `schema.ts` state."
2. **Review the generated SQL before it touches anything.** Since production already has most of this applied (via the prior `push`/manual-SQL route), the generated migration must be run through `drizzle-kit migrate` against a **fresh scratch database** first to confirm it reproduces the exact live schema — not applied to production directly, where most of the `CREATE TYPE`/`ALTER TABLE` statements would then fail with "already exists" errors.
3. For production itself: mark this migration as already-applied in the journal (drizzle-kit supports this) rather than re-running its DDL, since production already has the columns — the goal is to make the **journal** match reality, not to re-run DDL that already ran.
4. From this point forward, **no more `push --force` against production.** Every schema change, CRM or otherwise, goes through `generate` → review → `migrate`.

This is bookkeeping, not a data migration — no existing row's data changes. It has no backfill/rollback concern under §5 of the Phase 1a plan (additive/already-applied only).

---

## Part B — Phase 1b preview: RLS mechanics (design for review now, activated in 1b)

Captured now because Q1's amendments are specific enough to need sign-off on the mechanism before any code is written, even though activation is Phase 1b.

### Why `SET LOCAL`, not `SET`, and why it matters with a pooled driver

`apps/api`'s Drizzle client uses the `postgres` (postgres.js) driver, which pools physical connections. A plain `SET app.tenant_id = '...'` sets the GUC for the **remaining lifetime of that physical connection** — the next unrelated request that happens to reuse the same pooled connection would inherit the previous request's tenant context. That's a cross-tenant leak *caused by the fix itself*, worse than the current state because it would look like it's working in every manual test (single request, single connection, no reuse observed) and fail under real concurrent load.

`SET LOCAL app.tenant_id = '...'` is transaction-scoped: it is automatically reset at `COMMIT` or `ROLLBACK`, regardless of what happens to the underlying connection afterward. This is the only safe option with a connection pool.

**Mechanical requirement this creates:** every tenant-scoped query must run inside an explicit transaction that starts with `SET LOCAL`, not as a bare pooled query. Concretely:

```
BEGIN;
SET LOCAL app.tenant_id = '<uuid>';
-- ... all queries for this request ...
COMMIT;
```

The Phase 1a "tenant-scoped query helper" (task 1a.4) is the wrapper that makes this automatic — a request-scoped `db.transaction(async (tx) => { await tx.execute(sql\`SET LOCAL app.tenant_id = ${tenantId}\`); return handler(tx); })` invoked once per request (likely as a NestJS interceptor wrapping the route handler, using the already-resolved `@CurrentTenant()` value), so individual CRM services just receive an already-scoped `tx` and don't each have to remember to open the transaction themselves.

### Why `FORCE ROW LEVEL SECURITY`

`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` alone does **not** apply to the table owner — and the application's DB role is the table owner (it created the tables via migrations). Without `FORCE`, every CRM query would silently bypass the policy because it's always running as the owning role, making the whole rollout a no-op that looks correct in every test that doesn't specifically check for this. `FORCE ROW LEVEL SECURITY` closes that gap:

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leads
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

(`current_setting(..., true)` — the `true` missing-ok flag returns NULL instead of erroring when the GUC isn't set, which the policy then correctly evaluates as "matches nothing," failing closed rather than throwing on any connection that forgot to set it.)

Applied per-table as each CRM table is created/migrated in Phase 1b (leads, contacts, deals, activities, and the new organizations/pipeline/territory tables as they land) — not attempted platform-wide in Phase 1b, per the discovery doc's Q1 default (CRM-tables-first, platform-wide RLS retrofit tracked as a separate follow-up).

### Isolation suite — required cases (Phase 1b, named now)

1. **Red → green, not just green.** The suite must contain a test that runs *before* RLS is enabled on a table and asserts that cross-tenant reads currently succeed (proving the vulnerability is real and the test would actually catch a regression) — then, once RLS+FORCE+policy are applied, the same assertion flips to asserting the read is blocked. A single "RLS blocks cross-tenant reads" test that only ever runs green is exactly the kind of test that doesn't prove anything; this repo's zero-existing-tests starting point makes it easy to accidentally write only the green half.
2. **Pooled-connection-reuse test.** Explicitly acquire (or force, depending on what the postgres.js driver exposes) the same underlying physical connection across two sequential transactions for two different tenants — `SET LOCAL` tenant A, commit, then on the same connection `SET LOCAL` tenant B, commit — and assert tenant B's queries see zero of tenant A's rows and vice versa. This is the test that would have caught a `SET`-vs-`SET LOCAL` mistake; it must exist as its own named case, not be assumed covered by case 1.
3. **Owner-bypass test.** Assert that a raw query run as the table-owning role *without* going through the tenant-scoped helper (i.e., skipping `SET LOCAL` entirely) still returns zero rows — proving `FORCE ROW LEVEL SECURITY` is actually in effect, not just `ENABLE`.
4. **Missing-GUC-fails-closed test.** A transaction that never calls `SET LOCAL app.tenant_id` at all must see zero rows on any RLS-protected table, not an error and not all rows — confirms the `current_setting(..., true)` NULL-handling behaves as designed.

---

## Part C — Phase 1b preview: custom-field engine schema (design for review now)

Per Q4: `custom_fields jsonb` + `field_definitions` metadata table, **plus** a per-field B-tree expression index when a field is marked filterable or sortable (GIN alone doesn't serve range filters or ORDER BY), **plus** an answer on Phase 8 reportability.

```sql
CREATE TABLE field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type varchar(50) NOT NULL,        -- 'lead' | 'contact' | 'deal' | 'organization' | ...
  field_key varchar(100) NOT NULL,          -- the jsonb key, e.g. 'industry_vertical'
  label varchar(255) NOT NULL,
  field_type varchar(20) NOT NULL,          -- text | number | currency | date | datetime | select | multi_select | checkbox | link
  options jsonb,                            -- for select/multi_select
  required boolean NOT NULL DEFAULT false,
  filterable boolean NOT NULL DEFAULT false,
  sortable boolean NOT NULL DEFAULT false,
  reportable boolean NOT NULL DEFAULT false, -- see decision below
  help_text text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, entity_type, field_key)
);
```

Each CRM entity table (`leads`, `contacts`, `deals`, `organizations`, ...) gets one `custom_fields jsonb NOT NULL DEFAULT '{}'` column.

**Indexing rule:** whenever an admin sets `filterable=true`, `sortable=true`, or `reportable=true` on a field definition, the application creates (not a static migration — see below) a per-tenant, per-field B-tree expression index sized to that field's declared type:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_cf_<tenant_short>_<field_key>
  ON leads ((custom_fields ->> '<field_key>'))
  WHERE tenant_id = '<tenant_id>';
```

(Numeric/date fields cast the expression, e.g. `((custom_fields->>'deal_size')::numeric)`, so range queries and numeric sort actually use the index rather than doing a string comparison.)

This is **dynamic DDL triggered by tenant admin action**, not a versioned migration — which is a real operational departure from "schema-first" and needs explicit guardrails, stated now rather than discovered mid-build:
- `CREATE INDEX CONCURRENTLY` always (per Ground Rule #3 — no locking large tables), which means it cannot run inside the same transaction as the `field_definitions` update (Postgres disallows `CONCURRENTLY` in a transaction block) — the index-creation step is a separate, queued, retryable background job, not a synchronous part of the "save field definition" request.
- Index names are deterministic and tenant/field-scoped so a repeated toggle (on/off/on) doesn't accumulate orphaned indexes — `IF NOT EXISTS` on create, explicit `DROP INDEX CONCURRENTLY IF EXISTS` when a field is un-flagged or soft-deleted.
- An advisory lock (`pg_advisory_lock` keyed by tenant+field) around the create/drop prevents a rapid double-toggle from racing itself.

**Phase 8 reportability — answered now, since it constrains the shape:** **yes**, custom fields must be reportable, but only the subset explicitly flagged `reportable` (a field can be filterable/sortable without being reportable, e.g. a free-text note field is filterable-by-search but not a meaningful report dimension). `reportable=true` is restricted at the UI/validation level to types that are aggregation-safe — `number`, `currency`, `date`, `datetime`, `select` — never `text`/`multi_select`/`checkbox`-as-free-text, and setting it triggers the same B-tree expression index (reports need the same index a filter would). Phase 8's report builder treats a `reportable` custom field as an interchangeable "dimension" alongside native columns via one abstraction (a dimension is either `{column: 'stage'}` or `{customField: 'industry_vertical'}`, resolved to the right SQL expression by the same query-builder layer) — this is the constraint the "tell me now" was about, and it's now baked into `field_definitions` rather than retrofitted in Phase 8.

---

## Exit criteria for this document
- [ ] Part A (migration hygiene) approach approved — executed as part of Phase 1a task 1a.2
- [ ] Part B (RLS mechanics) approved as the design Phase 1b will implement — not executed now
- [ ] Part C (custom-field schema + indexing) approved as the design Phase 1b will implement — not executed now
