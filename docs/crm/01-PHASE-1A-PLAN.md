# CRM Foundation — Phase 1a Plan

**Status:** Draft for approval · **Date:** 2026-08-15
**Depends on:** `docs/crm/00-DISCOVERY.md` (approved)
**Rule:** No CRM feature work starts before 1a ships and is reviewed. 1a and 1b are reviewed independently.

Phase 1 from the original discovery doc was five projects wearing one name. Split per owner instruction:

- **Phase 1a (this doc):** vitest harness + test DB, migration hygiene, response envelope + pagination convention, tenant-scoped query helper (the plumbing everything else depends on, none of it CRM-specific).
- **Phase 1b (next doc, after 1a ships):** RLS rollout + isolation suite, custom-field engine, option-set tables, BullMQ workers.

Nothing in 1a touches CRM tables or CRM endpoints. It is pure platform foundation, chosen first because Phase 1b (RLS, custom fields) and every later CRM phase needs a place to put tests and a settled API contract before they can be verified at all.

---

## 1. Scope

| Task | Deliverable |
|---|---|
| 1a.1 | vitest config + a disposable Postgres test database (docker-compose service or testcontainers), wired into `turbo.json`'s existing `test` task |
| 1a.2 | Migration hygiene: capture the schema drift accumulated since `0004_complex_whizzer` via `drizzle-kit generate` as one reviewed migration; retire `deploy/*.sql` as a mechanism going forward |
| 1a.3 | Response envelope + pagination convention decision (§2 below) + reference implementation on ONE existing list endpoint as a worked example |
| 1a.4 | Tenant-scoped query helper — the transaction + connection-context wrapper that Phase 1b's RLS rollout will hang the `SET LOCAL` GUC on (built now, activated in 1b) |
| 1a.5 | Benchmark harness (seed synthetic rows, measure p95) — see §3, moved here per owner instruction, not Phase 10 |
| 1a.6 | C6 characterization tests for the four GST implementations — see §4 |

---

## 2. Response Envelope & Pagination — the decision I owe you

**Question:** standardize all endpoints with a compatibility shim, or new CRM endpoints only, legacy left as-is?

### Blast-radius findings (measured, not estimated)

- **95 controllers**, **84 service `findAll`-style methods** return bare arrays/objects today — no `ApiResponse`/`PaginatedResponse` envelope anywhere (confirmed: zero usages of either type outside `packages/shared-types`).
- **The frontend already tolerates an envelope for free.** `apps/web/src/lib/api.ts:179-189` (`unwrap<T>`) checks whether the response body is a non-array object with a `data` key, and if so returns `.data`, else returns the body as-is:
  ```ts
  function unwrap<T>(responseData: unknown): T {
    if (responseData !== null && typeof responseData === "object" &&
        !Array.isArray(responseData) && "data" in (responseData as Record<string, unknown>)) {
      return (responseData as ApiResponse<T>).data;
    }
    return responseData as T;
  }
  ```
  Every one of `get/post/put/del` (`api.ts:192-210`) routes through this. **Wrapping any endpoint's success response in `{success, data, message, timestamp}` requires zero frontend code changes** — the wrapper is transparently stripped before any hook sees it. This was the deciding fact.
- **Pagination metadata is the part that isn't free.** Grep across all 56 `apps/web/src/hooks/use-*.ts` files: **zero** reference `.total` or `PaginatedResponse`. No list UI today reads a total count — `createCrudHooks`'s `useList` (`hooks/create-crud-hooks.ts`) returns `T[]` directly as the query data, and every consuming component treats it as an array (`.map`, `.length`, etc.). Introducing `{data: T[], total, totalPages}` on an endpoint that a `useList`-consuming component already renders **would** break that component unless the hook and the component are updated together.

### Decision: **new CRM endpoints only, legacy left as-is.**

- All new CRM list endpoints (Phase 1b onward) return `PaginatedResponse<T>` — `{data, total, page, limit, totalPages}` — and single-record endpoints return `ApiResponse<T>` — `{success, data, message, timestamp}`. Both come free on the frontend via `unwrap()` for anything that only wants `T`/`T[]`; CRM's own new hooks additionally surface `total` for real pagination UI (which nothing today has).
- **The 84 existing non-CRM endpoints are not touched by this phase.** Retrofitting them would mean auditing and updating an unknown number of components across HR/Finance/Selling/Buying/Inventory that currently assume a bare array — work with zero CRM payoff and real regression risk, and explicitly out of scope per Ground Rule #10 (small, reviewable increments) and the anti-goal against speculative platform-wide rewrites.
- **No compatibility shim is built**, because none is needed: `unwrap()` already *is* the compatibility shim, and it was written before this decision, by whoever built the original API client — CRM inherits it for free rather than building a second one.
- The 1a.3 reference implementation: pick one existing CRM list endpoint (`GET /crm/leads`) and migrate it to the new envelope + `total` in Phase 1b as the pattern's first real usage — not in 1a itself (1a only lands the *convention*, agreed with the "no CRM feature work before 1a ships" rule: changing a CRM endpoint's response shape is CRM work).

**Consequence for `shared-types`:** `PaginatedResponse<T>`'s `page`/`limit` fields stay as declared; new CRM controllers additionally accept `?limit=&offset=` (matching the platform's actual, not aspirational, convention per the CLAUDE.md fix) and compute `page`/`totalPages` from `limit`/`offset`/`total` server-side, so callers get both idioms without the platform having to pick one globally.

---

## 3. Benchmark Harness — moved to Phase 1a, restated per-100k

The original spec's budgets (1M rows/tenant, p95 <400ms, Kanban <1s at 2,000 deals, import ≥5,000 rows/min) are restated against a **named target instance**, not the free-tier e2-micro this environment currently runs on, and not vague. Named target for all Phase 1a+ benchmarking:

> **GCP Cloud SQL for PostgreSQL, `db-custom-2-7680`** (2 vCPU, 7.5 GB RAM, SSD) — the smallest Cloud SQL tier that's a realistic "first paid tier" upgrade from the current e2-micro, and cheap enough (~$50-70/mo) to actually provision for benchmarking without it being a budget event. If actual production load ever needs more, that's a re-benchmark, not a redefinition of these numbers.

Budgets restated per 100k rows (linear checkpoints, not one distant 1M-row cliff) against that instance:

| Metric | Per 100k rows (tenant-scoped) | Rationale |
|---|---|---|
| List view (indexed filter + sort) | p95 < 100ms | Scales to <400ms at 1M rows if the index strategy holds linearly — the harness proves whether it does |
| Record page + timeline | p95 < 150ms flat (not row-count-dependent — bounded by one record's related rows) | |
| Kanban board | < 250ms per 100k open deals in a pipeline | Reaches spec's <1s only if bounded to realistic open-deal counts (2,000-ish), not all-time deals — harness must seed *open* vs *closed* separately |
| Import throughput | ≥ 1,000 rows/min per 100k-row batch | Spec's 5,000/min restated conservatively; re-target up once real batch-insert tuning happens |

**The harness ships in Phase 1a** (task 1a.5): a script that seeds N×100k synthetic tenant-scoped rows into a scratch schema/tenant, runs the above measurements, and fails CI-loud if a later phase regresses a checkpoint it previously passed. This means a Phase 3 (Deals) index mistake gets caught in Phase 3's own CI run, not discovered for the first time in a Phase 10 benchmark sweep — the entire point of moving it.

---

## 4. C6 — PricingService extraction sequencing (highest-risk item, sequenced explicitly)

Per instruction: **do not consolidate until told it's safe to; if the four implementations disagree, stop and show the divergence.**

1. **(Depends on 1a.1)** Test harness + test DB exist.
2. **Characterization tests** (task 1a.6): for each of the four GST implementations —
   - `selling/quotation/quotation.service.ts:113-130`
   - `selling/sales-order/sales-order.service.ts:124-144`
   - `selling/sales-order/sales-order.service.ts:336-417` (`createInvoice`, the only one with the CGST/SGST/IGST intra/inter-state split, driven by the state comparison at lines 324-326)
   - `finance/invoice/invoice.service.ts:121-162` (whose manual `create()` path additionally sets `taxAmount = 0` at line 130 — a known bug, not a style difference)

   pin each implementation's **current, un-modified output** against the same set of real fixtures (a shared set of line-item/discount/tax-rate/intra-state/inter-state scenarios pulled from actual data, e.g. the demo tenant's `tax_rates` + real customer billing states). These tests assert "this is what the code does today," not "this is correct" — they exist so any later refactor can prove it didn't silently change behavior.
3. **Compare.** If all four agree (accounting for the known `taxAmount=0` bug, which is a defect, not a legitimate divergence) → proceed to extract a shared `PricingService`, built from `createInvoice`'s logic (the only one with real GST-split correctness) per the discovery doc's original recommendation.
   If they disagree on anything else (rounding, discount-then-tax vs tax-then-discount ordering, inclusive vs exclusive handling) → **stop, present the divergence matrix, and do not pick a winner** — that's a business-logic decision for the owner, not an implementation detail.
4. Extraction itself (once cleared) is **not** Phase 1a or 1b work — it lands just before whichever phase first needs correct CRM→Quotation tax math (Phase 6, per the original risk R6), so the characterization tests have had time to sit in CI and catch any incidental drift in the meantime.

---

## 5. Data Migration Policy (applies to every phase from here on)

Per instruction: **no destructive migration without a stated backfill and rollback plan**, specifically called out for live telecalling data (leads, dispositions) and the `deals.stage` enum → `stageId` migration.

Standing rule for every phase touching an existing table:

- **Backfill plan** stated before the migration ships: what populates any new NOT NULL/FK column for existing rows, and what happens to rows that can't be cleanly backfilled (quarantine flag vs default value — stated explicitly per column, not assumed).
- **Rollback plan** stated before the migration ships: for additive changes (new nullable column, new table) this is usually "drop the column/table," but for anything that *changes the meaning* of existing data (see below) the rollback must be able to reconstruct the pre-migration state, not just undo the DDL.
- **No column is dropped or repurposed in the same migration that adds its replacement.** Dual-write/dual-read period first, cutover second, drop third — three separate, separately-reviewable migrations minimum.

Named ahead of time, because they're already visible from the discovery doc:

| Change | Backfill | Rollback |
|---|---|---|
| `deals.stage` (enum) → `deals.stageId` (FK) becoming authoritative | Every existing `deals.stage` enum value maps to exactly one seeded `deal_stages` row per tenant (six enum values → six default stages, seeded per-tenant on the same migration). Backfill sets `stageId` from that map for every existing deal, in the same transaction as the stage-seed insert. | `stage` enum column is *not dropped* in this migration — it becomes a generated/denormalized read-through column synced from `stageId` for one full phase before any drop is even proposed. Rollback = stop writing `stageId`, `stage` is already still authoritative. |
| Any change to `leads`/`activities` telecalling columns (disposition, `callAttempts`, `nextFollowUpAt`) | These are additive-only in every phase currently planned — no backfill needed beyond column defaults. If a future phase needs to *reinterpret* an existing value (e.g. splitting `lastDisposition` into a richer state machine), that gets its own named backfill plan at the time, not assumed here. | Additive columns roll back by dropping the column; no data loss since nothing existing was overwritten. |
| Organizations dedupe/normalization pass (Q5, see 00-DISCOVERY.md) | Normalize `leads.company`/`contacts.company`/`deals` (via contact) free text into candidate `organizations` rows *before* any FK is added — output is a review queue, not an automatic write, given free-text company names are messy (case, legal suffixes, whitespace). `organizationId` FK columns are added **nullable** and only populated after the dedupe pass is reviewed. | Rollback = the FK columns are nullable and unpopulated; dropping them loses nothing since the source-of-truth (`company` text) is untouched throughout. |

---

## 6. Exit Criteria for Phase 1a

- [ ] vitest running in CI against a real (disposable) Postgres, wired into `turbo.json test`
- [ ] Migration chain fully captures schema drift since `0004_complex_whizzer` — `apps/api/src/database/migrations` and `meta/_journal.json` back to being the single source of truth, `deploy/*.sql` no longer used for anything ORM-schema-related
- [ ] Response envelope + pagination convention written up as a short ADR-style note (this document §2) + one worked reference diff
- [ ] Tenant-scoped query helper exists and is unit-tested in isolation (RLS activation itself is Phase 1b — this just builds the transaction/GUC-setting plumbing Phase 1b will turn on)
- [ ] Benchmark harness runs against the named Cloud SQL target and produces a baseline report at 100k/500k/1M synthetic rows
- [ ] C6 characterization tests exist for all four GST implementations, with a divergence report (empty if they agree, populated and escalated to owner if not)
- [ ] Reviewed and approved before Phase 1b (RLS, custom fields, BullMQ workers) starts

No feature code beyond the above six deliverables. No CRM table is touched.
