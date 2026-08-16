# Schema-First Migration Design — Phase 1a (hygiene, EXECUTED) + Phase 1b (RLS/custom-fields) preview

**Status:** Part A **fully executed and closed out** — production stamped, corrective migration applied, verified empty diff. Parts B/C revised per owner review (B1-B3, S1-S3), design only, not yet built.
**Rule:** No migration in Part B/C is applied until Phase 1b is separately approved.

**Policy breach, open, not yet closed:** `deploy/migrate-notification-holiday-permissions.sql`, added when `PermissionsGuard` was wired onto `notification.controller.ts`/`holiday-ess.controller.ts`, put the `deploy/*.sql` mechanism **back into use** — the exact mechanism Part A's closing line says is retired ("no more `push --force` against production... every schema change goes through `generate` → scratch-DB diff → `migrate`"; the same reasoning applies to ad hoc data reconciliation, not just schema DDL). That file was never applied to production and is not itself dangerous sitting in the repo, but it's a second instance of the same pattern this document exists to stop, and it needs to be replaced by a versioned migration in `apps/api/src/database/migrations/`, not deleted-and-forgotten. Tracked as open until that replacement lands (see the draft referenced in the corresponding session record — not committed as of this note, per instruction to draft only).

---

## Part A — Phase 1a: capturing the schema drift since `0004_complex_whizzer` (EXECUTED)

### What was done, precisely, in order

1. **Backup first.** `pg_dump -F c` of the live `nexuserp` database taken before anything else touched the server (`nexuserp_backup_20260814_193330.dump`, 951,627 bytes). Copied to two locations: the VM (`/tmp/`) and pulled to local disk. Not deleted by the scratch-DB cleanup step.
2. **Generated the drift-capture migration locally**, `drizzle-kit generate --name=drift_capture_since_0004`, diffing current `schema/*.ts` against `meta/0004_snapshot.json` — no DB connection involved, pure file-diffing. Produced `0005_drift_capture_since_0004.sql`.
   - **One correction made before proceeding:** the two `idx_item_warehouses_reorder`/`idx_items_default_supplier` indexes that were applied directly to production in the earlier duplicate-`0004`-prefix fix (via a raw `deploy/*.sql` file, bypassing the ORM) were **not tracked in `schema/inventory.ts` at all**, so the first `generate` run didn't know about them. Fixed properly rather than left as a known gap: added `index('idx_items_default_supplier')` (partial, `WHERE default_supplier_id IS NOT NULL`) and `index('idx_item_warehouses_reorder')` as real Drizzle `index()` declarations on `items`/`itemWarehouses`, then regenerated `0005` so it's now the single, correct source of truth for these indexes going forward — instead of a raw SQL file the ORM doesn't know exists.
3. **Built a scratch database from the full chain — twice, for two different verifications:**
   - First, applied `0000`–`0005` via raw `psql -f` (in order, `ON_ERROR_STOP=1`, all six files succeeded cleanly) to a throwaway `scratch_migration_check` database on the **same production Postgres server** (not a separate container/instance — this gives exact engine-version parity with zero new infrastructure, and the database is trivially dropped afterward). Confirmed table count matches production exactly: **158 tables in both.**
   - Second, dropped and recreated `scratch_migration_check` **empty**, then ran the **actual `drizzle-kit migrate` CLI** against it (from inside the running `nexus-api` container, which already has `drizzle-kit` in `node_modules` and the config/migrations baked into its image — overridden with `DB_NAME=scratch_migration_check` for this one invocation only, never touching `nexuserp`). This is what actually determined the stamping mechanism — see below.
4. **Schema-only diff, both ways** (`pg_dump --schema-only --no-owner --no-privileges`, plus an order-independent structural comparison via `information_schema.columns`/`pg_constraint`/`pg_indexes` — the raw `pg_dump` text diff alone was misleading because column *declaration order* differs between a database that grew via years of incremental `ALTER TABLE ADD COLUMN` and one built from a single fresh migration chain, which is cosmetic, not structural):
   - **Columns: identical.** Order-independent diff of `(table, column, type, nullable, default)` across all 158 tables: **zero differences** (`diff` exit code 0).
   - **Indexes: identical.** Zero differences, including the two newly-tracked ones.
   - **Constraints: one real difference**, and only one, across the entire schema: the `lead_candidates.tenant_id` foreign key is named `lead_candidates_tenant_id_fkey` on production, but the fresh migration chain names it `lead_candidates_tenant_id_tenants_id_fk`. Cosmetic (constraint still enforces the identical FK either way — `_fkey` is Postgres's own auto-generated name when a constraint isn't explicitly named, `_tenants_id_fk` is drizzle-kit's naming convention), but real: if the journal were stamped as "applied" without fixing this, a future migration that tries to `DROP CONSTRAINT lead_candidates_tenant_id_tenants_id_fk` (the name drizzle-kit expects) would fail against production, which has the other name.

### The stamping mechanism — determined empirically, not assumed

Running native `drizzle-kit migrate` against the empty scratch DB created (and only ever this, confirmed by direct query):

```
Table: drizzle.__drizzle_migrations   -- dedicated schema, not public
  id          serial primary key
  hash        text not null
  created_at  bigint
```

Six rows, one per migration file, in order. **The `hash` column is `sha256(raw file bytes)` of the migration `.sql` file exactly as it sits on disk** — verified by independently computing `sha256sum` of the local `0005_drift_capture_since_0004.sql` and confirming it matches the value `drizzle-kit migrate` inserted byte-for-byte (`83421e2ddec3f4b0d3a971d15ba2648d0d28dbb4f4b38d41c197a97a2c887331`). `created_at` for entries 0–4 exactly matches the `when` timestamps already recorded in `meta/_journal.json`; entry 5's `created_at` is whatever wall-clock value the local `drizzle-kit generate` run wrote into the journal when `0005` was created.

**Confirmed also (the reason B1 was right to be cautious): `drizzle-kit migrate` trusts its own tracking table exclusively — it does not introspect actual schema state.** The first attempt (against a scratch DB that already had the full schema from the raw-`psql` path but no tracking table) tried to re-run `0000` from the top and failed on `CREATE TYPE ... already exists`. This is exactly the failure mode a naive "just stamp the journal" would have risked in the other direction — inserting rows without verifying they're true.

### Corrective action — executed, with the ordering bug fixed before running anything

The original proposal here had steps reversed (apply DDL, then stamp) — flagged before execution: applying `0006` directly and stamping only `0000`–`0005` would leave `0006` applied-but-unrecorded, so the next `drizzle-kit migrate` would try to re-run it and fail on a constraint name that no longer exists. **Corrected sequence actually run, in order:**

1. **Froze and committed `0005` and `0006` first.** Hashes computed from the git-committed file bytes (`git show HEAD:<path> | sha256sum`), not working-copy bytes, so nothing could shift under the stamp between computing and inserting.
2. **Fresh `pg_dump` of production immediately before any write** (`nexuserp_prewrite_20260816_070621.dump`, 951,627 bytes — the 14 Aug backup was one write-cycle stale by the time execution actually started). Confirmed an off-VM local copy exists alongside the on-VM one.
3. **Stamped `0000`–`0005`** into `drizzle.__drizzle_migrations` (schema + table created first and independently verified to exist before any row was inserted). Tracking-table contents and monotonic `created_at` check reported to the owner before proceeding.
4. **Ran `drizzle-kit migrate` natively against production directly** (not a stamp — the tool's own bootstrap correctly no-op'd on the schema/table it found already present via `IF NOT EXISTS`, recognized rows 1–6 as already-satisfied by hash match, and applied **only** `0006`'s DDL, recording its own row 7). This is what actually ran the `ALTER TABLE ... RENAME CONSTRAINT` on production, and it's also what proved the stamped hashes were correct — a wrong hash here would have made `migrate` try to re-run an already-satisfied migration and fail loudly, not silently succeed.
5. **Re-ran the full structural diff against a freshly rebuilt scratch database.**

**A real bug surfaced at step 5, exactly the kind this verification exists to catch:** the first version of `0006` used an *unconditional* `RENAME CONSTRAINT lead_candidates_tenant_id_fkey TO ...`. That name only ever existed on **production** (created via a raw `deploy/*.sql` script, outside the ORM). A fresh chain's own `0005` creates `lead_candidates` with the *correct* name directly — so the unconditional rename failed with "constraint does not exist" the moment step 5 rebuilt scratch from a clean `0000`. Fixed by wrapping the rename in a `pg_constraint` existence check (no-op on a fresh chain, still fixes production's specific history) — see the current `0006_fix_lead_candidates_fk_name.sql`. Since the file's bytes changed, production's already-stamped row 7 was **updated** (not re-inserted) to the corrected file's hash — the *outcome* on production was already correct (the rename had already run); only the recorded-migration-content needed to match the now-portable file.

**Final verification, after the fix:** rebuilt scratch a third time from clean, full `0000`–`0006` chain applied via native `drizzle-kit migrate` with zero errors, 158 tables. Order-independent structural diff (columns, constraints, and indexes) against production: **all three exit code 0 — completely empty.** `scratch_migration_check` dropped from the production server and confirmed absent via a `pg_database` lookup; not left behind.

From this point forward, **no more `push --force` against production.** Every schema change goes through `generate` → scratch-DB diff → `migrate`.

---

## Part B — Phase 1b preview: RLS mechanics (revised per B2/B3, design for review — not executed)

### `WITH CHECK`, not just `USING` (B2)

The original design only specified `USING (...)`, which gates **reads** (`SELECT`, and the read-side of `UPDATE`/`DELETE` — which rows are visible to update/delete). It does **not** gate what a write is allowed to *write*. Without `WITH CHECK`, a request scoped to tenant A could `INSERT`/`UPDATE` a row with an explicit foreign `tenant_id` (tenant B's id) and the write would succeed — `USING` never inspects the row *being written*, only rows being *read back*. Corrected:

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leads
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

`FOR ALL` applies both clauses to every operation (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) — `WITH CHECK` is what actually rejects an `INSERT`/`UPDATE` that would produce a row failing the tenant match.

### `NULLIF(..., '')` before the cast (B2)

`current_setting('app.tenant_id', true)` returns SQL `NULL` (fail-closed, matches nothing) when the GUC was never set at all — the intended failure mode. But if a caller ever sets it to an **empty string** (`SET LOCAL app.tenant_id = ''`), `current_setting` returns `''`, and `''::uuid` **throws** ("invalid input syntax for type uuid") instead of failing closed — an application bug (setting the GUC to `''` instead of skipping it) would surface as a confusing cast error instead of a clean "zero rows visible." `NULLIF(current_setting(...), '')` converts the empty-string case to `NULL` before the cast, so both "never set" and "set to empty" fail closed identically, and neither ever throws from inside the policy itself.

### Isolation suite — now 5 required cases (B2 adds #5)

1. **Red → green**, not just green (unchanged from the original design): a test that runs before RLS is enabled and proves cross-tenant reads currently succeed, then flips to blocked once RLS+FORCE+policy are applied.
2. **Pooled-connection-reuse test** (unchanged): `SET LOCAL` tenant A, commit, `SET LOCAL` tenant B on the same reused physical connection, commit — assert zero cross-visibility either direction.
3. **Owner-bypass test** (unchanged): a raw query as the table-owning role, skipping the tenant-scoped helper entirely, still sees zero rows — proves `FORCE ROW LEVEL SECURITY` is actually in effect.
4. **Missing-GUC-fails-closed test** (unchanged, now also covers the `NULLIF` empty-string case): a transaction that never sets the GUC, and separately one that sets it to `''`, both see zero rows and neither throws a cast error.
5. **NEW — cross-tenant write rejection.** As tenant A, attempt `INSERT INTO leads (tenant_id, ...) VALUES ('<tenant-B-uuid>', ...)` — assert the `INSERT` is rejected by `WITH CHECK`, not silently accepted. Separately, as tenant A, attempt to `UPDATE` one of tenant A's own rows to set `tenant_id = '<tenant-B-uuid>'` — assert that's rejected too. This is the case that specifically proves `WITH CHECK` exists and works, since none of cases 1–4 would have caught its absence.

### Non-request execution paths (B3) — designed now, since 1b lands RLS and workers in the same phase

`FORCE ROW LEVEL SECURITY` applies to **every** connection using the table-owning role, including ones that never go through an HTTP request at all. Four paths need an explicit design before 1b starts, or they silently see zero rows the moment RLS is turned on:

| Path | Problem under FORCE RLS | Design |
|---|---|---|
| **`drizzle-kit migrate`** | DDL mostly unaffected, but any migration that needs to **backfill data across all tenants** (e.g. the `deals.stage`→`stageId` backfill from `01-PHASE-1A-PLAN.md` §5) would only see one tenant's rows if run through the normal app role. | A **separate Postgres role** (`nexus_migrator`, granted `BYPASSRLS`) used **only** by `drizzle-kit migrate`'s connection string and nothing else. Never used by the request-serving pool. |
| **Seeds** (`database/seeds/index.ts`) | Seeding writes across the demo tenant and (per Phase 1a task 1a.5) synthetic benchmark tenants — cross-tenant by nature. | Same `nexus_migrator` (`BYPASSRLS`) role, or a dedicated `nexus_seeder` role if separating migration- from seed-privileges is preferred later — not decided now, default to reusing `nexus_migrator` since both are operator-invoked, never request-driven. |
| **BullMQ workers** (Phase 1b also lands these) | A worker process is long-lived and handles jobs for *many* tenants over its lifetime — it must never hold one tenant's `SET LOCAL` across multiple jobs. | Each job payload carries `tenantId` (jobs are always enqueued from an already tenant-scoped context). The worker's job handler calls the **same** tenant-scoped-transaction helper built in Phase 1a task 1a.4, but invoked per-job rather than per-HTTP-request: `withTenantScope(job.data.tenantId, async (tx) => { ... })`, opening and closing its own `SET LOCAL`-scoped transaction for the duration of that one job only. Runs under the normal RLS-enforced app role — never `BYPASSRLS`. |
| **In-process `@Cron` jobs** (`scheduled-jobs.service.ts`) — until Phase 1b replaces them with real queue workers, these still run in the interim | A cron handler today loops "for each tenant, do X" in one process invocation — under FORCE RLS this must not be one long transaction spanning tenants. | Same `withTenantScope(tenantId, fn)` helper, called once per tenant **inside** the existing per-tenant loop — each iteration gets its own short-lived scoped transaction, sequentially. Still the RLS-enforced role, not `BYPASSRLS` — a cron job has no more right to cross-tenant access than a request does. |

**Design consequence for Phase 1a task 1a.4:** the tenant-scoped query helper must be built as a **plain callable** (`withTenantScope(tenantId, fn)`) from the start, with the NestJS interceptor being one thin caller of it (deriving `tenantId` from `@CurrentTenant()`) rather than the helper being interceptor-shaped and workers having to route around it. This changes nothing about 1a's own scope (1a builds the plumbing, doesn't activate RLS) but fixes the shape so 1b doesn't have to retrofit it.

### Scoping the transaction to DB-only work (S1)

The `SET LOCAL`-scoped transaction must contain **only database calls**. No `await` on a GCS upload, an outbound SMTP send, or any third-party API call while the transaction is open — two independent reasons: it pins one pooled connection for however long the external call takes (directly reducing effective concurrency under load), and if that external call hangs, the connection sits `idle in transaction` — which is a real availability failure (connection-pool starvation), not a style concern, once every tenant-scoped query is forced to go through this pattern.

**Written rule for every CRM handler from Phase 1b onward:** if a handler needs both a DB write and an external call (GCS, email, webhook), the DB work happens inside the scoped transaction, commits, and *then* the external call happens outside any open transaction — or, for anything that can tolerate slight delay, the DB transaction writes an outbox/job row and commits, and a separate worker (itself using its own short `withTenantScope` per S1/B3) performs the external call later.

**Timeouts, set at the role level so a bug can't accumulate stuck connections:**
```sql
ALTER ROLE nexus_app SET statement_timeout = '30s';
ALTER ROLE nexus_app SET idle_in_transaction_session_timeout = '10s';
```
`statement_timeout` generous enough for a real report/import query, not infinite. `idle_in_transaction_session_timeout` much shorter — under the S1 rule, a scoped transaction should only ever be "open, run a few DB queries, commit," never waiting on anything external, so 10 seconds idle inside an open transaction means something is already wrong and should be killed, not left to accumulate.

**Pool sizing**, stated explicitly rather than left implicit, **per API instance**: against the named `db-custom-2-7680` benchmark target (2 vCPU) — **request-serving pool: max 20 connections. Separate, smaller worker pool: max 5.** 25 per instance.

**Assumed instance count, stated rather than left implicit:** this app runs a small number of API replicas at its current and near-term scale — assume **3** as the planning number (matches a realistic small-team-ERP horizontal-scale target, not the current single-instance e2-micro reality, which has room to add replicas long before it needs a bigger pool-per-instance). At 3 instances: 3 × 25 = **75 connections**, against Cloud SQL's nominal `max_connections=100` at the `db-custom-2-7680` tier. Cloud SQL reserves a handful of connections for its own maintenance/superuser use (single digits, tier-dependent) — meaning the **effective headroom above 75 is genuinely thin**, roughly 15-20 connections for `nexus_migrator`, admin/psql sessions, and any margin at all. This is not comfortable headroom, and the benchmark harness must explicitly test with all 3 instances' pools saturated simultaneously (75 concurrent connections, not just one instance's 25) as one of its checkpoints — if that reveals real contention, the fix is either a larger Cloud SQL tier (more `max_connections`) or a connection pooler (PgBouncer) in front of Postgres, not silently shrinking the per-instance pool sizes below what §3's benchmarks show is needed. Not decided now — flagged as the concrete next question the benchmark answers.

---

## Part C — Phase 1b preview: custom-field engine schema (revised per S2/S3, design for review — not executed)

Schema unchanged in shape from the original draft (`field_definitions` + per-entity `custom_fields jsonb`), with two corrections.

### S2 — date/datetime fields cannot use a `::date`/`::timestamptz` expression index

Postgres marks the text→`date` and text→`timestamp[tz]` casts as **`STABLE`**, not `IMMUTABLE` — the parse can depend on session `DateStyle`/`TimeZone` GUCs for ambiguous input. Postgres **rejects** `CREATE INDEX ... ((expr::date))` outright ("functions in index expression must be marked IMMUTABLE") for exactly this reason. `::numeric` has no such issue (no locale/session dependency) and is unaffected.

**Decision: ISO-8601 text indexing**, not a custom `IMMUTABLE` wrapper function. The custom-field engine's write-side validation enforces that any `date`/`datetime`-typed custom field value is stored in the `custom_fields` jsonb strictly as an ISO-8601 string (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`) — never accepted in any other format, rejected at the API boundary if it's not. ISO-8601 text sorts **lexicographically identically** to chronological order, so a plain B-tree index on the raw text expression (`((custom_fields->>'due_date'))`, no cast at all) correctly serves both equality/range filtering and `ORDER BY` with no `IMMUTABLE`-violation risk and no extra function to write, deploy, or maintain. Chosen over a wrapper function because it needs zero additional database objects and the write-side format constraint is something the field-validation layer needs to enforce anyway (a custom field's stored representation should be normalized regardless of indexing concerns).

### S3 — index proliferation is a budget risk, and per-tenant-partial vs composite-global is now a benchmark question, not an assumption

**Cap, enforced in `field_definitions` create/update validation:** maximum **20** fields flagged `filterable`/`sortable`/`reportable` per `(tenant_id, entity_type)`. Each flagged field is one more index maintained on a hot, shared table (`leads`, `deals`, ...) — unbounded tenant self-service index creation is a real availability risk for every *other* tenant sharing that table, which is a sharper version of Ground Rule #3's "must not lock large tables" than the original draft accounted for. The 21st flagged field is rejected with a clear error, not silently ignored.

**Left genuinely open, not asserted:** the original design proposed one **per-tenant partial** index per flagged field (`CREATE INDEX ... ON leads ((custom_fields->>'key')) WHERE tenant_id = '<tenant>'`). The alternative — one **composite, global** index per field key (`CREATE INDEX ... ON leads (tenant_id, (custom_fields->>'key'))`, shared across every tenant that happens to use that field key) — has a fundamentally different scaling shape: far fewer total indexes as tenant count grows, at the cost of a wider (though still leading-column-selective) index each query has to use. **This is now Phase 1a benchmark work, not a design-time guess** — added as a new checkpoint in `01-PHASE-1A-PLAN.md` §3: seed N synthetic tenants × M flagged custom fields each, measure filter/sort query p95 under both indexing strategies at 100k/500k rows, and let the measured result pick the default Phase 1b ships with (with the cap above applying to either outcome).

**Dynamic `CREATE INDEX CONCURRENTLY` mechanics** (unchanged from the original draft): triggered by an admin toggling `filterable`/`sortable`/`reportable`, run as a queued background job (never inside the same transaction as the `field_definitions` write, since Postgres disallows `CONCURRENTLY` inside a transaction block), deterministic per-tenant-or-global index names depending on which strategy the benchmark selects, `IF NOT EXISTS`/`DROP INDEX CONCURRENTLY IF EXISTS` paired with an advisory lock keyed by (tenant, field) to prevent a rapid toggle from racing itself.

**Phase 8 reportability** (unchanged, restated): **yes**, custom fields are reportable — the `reportable` flag (restricted to `number`/`currency`/`date`/`datetime`/`select`) drives the same index mechanism and lets Phase 8's report builder treat a reportable custom field as a `{customField: 'key'}` dimension alongside native `{column: 'stage'}` dimensions through one query-builder abstraction.

---

## Exit criteria for this document

- [x] Part A executed: backup taken, scratch DB built two ways, schema diff run and analyzed down to a single real difference, stamping mechanism determined empirically (not assumed)
- [x] Part A corrective step: `0006` written, committed, hash-stamped, applied natively to production, a real portability bug in it caught by re-diffing and fixed, production's stamp updated to match, final diff confirmed **completely empty** (columns, constraints, indexes). `scratch_migration_check` dropped and confirmed absent. **Part A is closed.**
- [ ] Part B (RLS mechanics, revised with `WITH CHECK`, `NULLIF`, 5 isolation cases, non-request execution paths, tx scoping/timeouts/pool sizing) — approved as the design Phase 1b will implement, not executed now
- [ ] Part C (custom-field schema, revised with ISO-8601 text indexing and the index-cap + composite-vs-partial benchmark question) — approved as the design Phase 1b will implement, not executed now
