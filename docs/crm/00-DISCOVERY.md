# CRM Module — Phase 0: Discovery & Gap Analysis

**Status:** Approved defaults, amended · **Date:** 2026-08-15 · **Author:** Claude (4 read-only discovery agents + 4 independent line-citation verification agents)
**Rule:** No CRM feature code until Phase 1a (`docs/crm/01-PHASE-1A-PLAN.md`) ships and is reviewed.

> Scope: inventory what the platform already provides, catalogue the ERP entities the CRM
> must hand off to, gap-analyse the full CRM spec (§4–§9 of the spec) against reality, list
> the risks that will fight the build, propose the module layout, and record the decided
> defaults (with the owner's amendments). Every claim below was verified in a second,
> independent pass with a real file:line citation — see §0.

---

## 0. Verification Methodology & Corrections

This document went through two passes: an initial discovery sweep (4 parallel read-only agents,
one per section below), and a second, independent verification sweep (4 more agents, no access
to the first pass's reasoning) that re-derived exact file:line citations for every material claim
and flagged anything wrong or unverifiable. This second pass exists because **three material
facts were asserted incorrectly, then reversed, in consecutive turns of this same session**
before this document was first drafted (migration tooling, DTO validation coverage, and the test
runner — see the table below). That is not acceptable for a document this plan depends on, so
nothing below ships without a citation a reader can open and check.

### Corrections found by the verification pass (beyond the 3 already fixed before drafting)

| Claim | What was wrong | Correct version | Cite |
|---|---|---|---|
| JWT payload shape | Stated as `sub, email, tenantId, roleId, permissions[], roleSlug, employeeId, type` | The `JwtPayload` **interface** (`common/decorators/current-user.decorator.ts:3-15`) has no `type` field and *does* include `firstName`/`lastName`, which the original claim omitted. `type: 'access'`/`type: 'refresh'` is spliced in only at sign-time, not part of the interface. | `auth.service.ts:654-672` |
| `@CurrentTenant()` fallback operator | Described as `user.tenantId ?? req.tenantId` | Actual operator is `\|\|`, not `??` — functionally near-identical here (tenantId is never `''`/`0`) but not the literal code | `common/decorators/current-tenant.decorator.ts:6` |
| Lead import dedupe key | Described as "phone when present, else composite of company/name+city+state" (phone as the *primary* key, composite as *fallback*) | Actual logic is identity-first: when a company/name identity exists, the key is `n:${company‖name}|city|state|phone}` — **phone is folded into the composite**, not an alternative to it. Phone-alone (`p:`) or location-alone (`x:`) keys are the fallback, used only when no name/company identity exists. This is the inverse of what was originally claimed — and confirms the dedupe logic was revised (correctly, as part of the Lead Finder build) after I originally wrote a simpler version of it earlier in this session. | `modules/crm/lead/lead.service.ts:313-319` |

### Could Not Verify (explicit — nothing below was force-cited)

- **Guard coverage on all 95 controllers.** Verified precisely that `ThrottlerGuard` is the only `APP_GUARD` (`app.module.ts:150-153`) and confirmed the pattern on a representative controller (`supplier.controller.ts:27`). Did **not** individually open all 95 controllers to confirm every one carries `@UseGuards(JwtAuthGuard, PermissionsGuard)` — the original sweep's raw grep counts (103 `@UseGuards` hits vs 100 `@RequirePermissions` hits) suggest a small number of endpoints may differ, but which ones is unconfirmed. Treat "guards are opt-in and therefore some endpoint could be missing them" as the safe assumption, not "we checked and they're all fine."
- **Pagination convention across all 76 `@Query`-using controllers.** One representative pair (`supplier.controller.ts`/`supplier.service.ts`) was verified line-by-line. The claim that this is the *general* pattern rests on the original sweep's broader grep, not an individual line-check of all 76.
- **MeiliSearch's actual wiring status.** Confirmed it's a declared dependency and confirmed the representative list endpoint uses SQL `LIKE`. Did not exhaustively check whether *any* endpoint anywhere in the codebase does call into MeiliSearch — absence wasn't proven, only non-presence in the sampled path.
- **Historical provenance of the two deleted orphan migration files** (`0004_indian_statutory_payroll.sql`, `0005_inventory_valuation_reorder.sql` — see §5 R10, now fixed). Confirmed their DDL content was already covered by `0004_complex_whizzer.sql` (except two indexes, confirmed absent on production and since applied — see the commit that fixed this). Did not determine *who* created these files or *when*, since no journal entry or timestamp exists for them.
- **Full extent of `any`/unvalidated DTOs in Finance.** Confirmed `finance/account/account.controller.ts` and `finance/journal-entry.service.ts` as concrete examples. Did not enumerate every Finance endpoint to produce a complete list of validation gaps outside CRM — out of scope for a CRM discovery doc, flagged here only so it isn't mistaken for a complete audit.

---

## 1. Stack & Conventions Inventory

| Concern | Reality (cited) |
|---|---|
| **Monorepo** | pnpm@10.13.1, Node ≥22 (`package.json:6,8`), Turborepo `^2.8.16` (`package.json:35`). Workspaces `apps/*`, `packages/*` → `@nexus-erp/{shared-types,utils,config}`. |
| **API runtime** | NestJS, compiled to **CommonJS** (`apps/api/tsconfig.json:4`) but source uses **`.js`-suffixed** imports (`apps/api/src/main.ts:6`, `from './app.module.js'`). Match this in every new file. |
| **Global prefix** | `api/v1`, excludes `/health` — `main.ts:47`. No URI versioning. |
| **Global pipes/filters** | `ValidationPipe({whitelist:true, transform:true, forbidNonWhitelisted:true, transformOptions:{enableImplicitConversion:true}})` — `main.ts:33-42`. Global `HttpExceptionFilter` — `main.ts:44`. |
| **Auth/RBAC guards** | **Opt-in per controller** via `@UseGuards(JwtAuthGuard, PermissionsGuard)` (e.g. `supplier.controller.ts:27`) — only `ThrottlerGuard` is registered as `APP_GUARD` (`app.module.ts:150-153`). A controller that omits the decorator is unprotected; see §0 Could-Not-Verify re: full coverage. |
| **Module registration** | Static imports into `AppModule.imports`; domain module → sub-modules (e.g. `crm.module.ts:2-9` imports Contact/Deal/Activity/Lead/LeadFinder). No auto-discovery. |
| **Error envelope** | `HttpExceptionFilter`'s `ErrorResponse` (`common/filters/http-exception.filter.ts:11-16,48-54`) → `{statusCode, error, message: string\|string[], timestamp, path}`, matching `ApiError` in `packages/shared-types/src/api.ts:16-22`. |
| **Success envelope** | ⚠️ `ApiResponse<T>`/`PaginatedResponse<T>` declared (`packages/shared-types/src/api.ts:1-14`) but **used by zero endpoints** — services return raw arrays/objects. Frontend already tolerates a `{data:T}` wrapper transparently via `unwrap()` (`apps/web/src/lib/api.ts:179-189`) — see the Phase 1a decision in `01-PHASE-1A-PLAN.md` §2. |
| **Validation** | class-validator DTOs are the norm (101/110 `*.dto.ts` files). Exceptions: **CRM `lead`/`lead-finder` DTOs are plain `export interface`, no decorators** (`modules/crm/lead/lead.service.ts:27-83`, `modules/crm/lead-finder/lead-finder.service.ts:13,21`); Finance `account`/`journal-entry` use `any`/local interfaces (not exhaustively enumerated — §0). |
| **Pagination convention** | Real convention = `limit`/`offset`, hardcoded per-endpoint sort, **no total count returned** — not the `page`/`sort_by`/`sort_order` shape `shared-types` declares. Verified line-by-line on `modules/buying/supplier/{supplier.controller,supplier.service}.ts:39-47,21-59` (service returns a bare array at line 58, no count query anywhere in `findAll`). |
| **DB client** | `@Global()` `DatabaseModule` (`database/database.module.ts:10-11`), token `DATABASE` (`:7`), type `DrizzleDB = PostgresJsDatabase<typeof schema>` (`:8`), exported at `:25`. |
| **Schema** | `apps/api/src/database/schema/*.ts` (~33 files, barrel `index.ts`). Money is `decimal(20,4)` (verified broadly across `finance.ts`/`selling.ts`, not a single fixed 2dp/cents convention as CLAUDE.md previously claimed — now fixed). |
| **Transactions** | `this.db.transaction(async (tx) => …)`. Canonical: `finance/journal-entry/journal-entry.service.ts:123` (wraps entry+lines insert), balance check at `:442-446` (`Math.abs(totalDebit - totalCredit) > 0.001`, re-checked at `:181-188`). |
| **Migrations** | `drizzle-kit generate`/`migrate` (`apps/api/package.json:10-11`), committed `0000`-`0004` under `database/migrations`, matching `meta/_journal.json` 1:1 as of this document — **the prior duplicate-`0004`-prefix hazard has been fixed** (see §5 R10) — but the drift accumulated on top of `0004_complex_whizzer` via `push --force` still needs to be captured as one reviewed migration; this is Phase 1a task 1a.2 (`docs/crm/02-SCHEMA-MIGRATION-DESIGN.md` Part A). |
| **Seeds** | `apps/api/src/database/seeds/index.ts` (`db:seed`, idempotent). |
| **Tests** | ⚠️ **vitest is the configured runner** (`apps/api/package.json:9,64`, `"test": "vitest"`) — not jest as I initially and incorrectly stated in an earlier turn of this session. Confirmed **zero** `*.spec.ts`/`*.test.ts` files exist anywhere under `apps/api/src` or `apps/web/src`, and no vitest config file exists. `apps/web` has no test script at all. |
| **Web** | Next.js **15** (not 14, as CLAUDE.md previously claimed — now fixed) App Router; TanStack Query + Zustand (`stores/auth.store.ts`); shadcn/ui (no tracked `components.json`); axios client `lib/api.ts`; `createCrudHooks` factory + bespoke `use-*.ts` (56 hook files total). Permission gating is **100% client-side** (no `middleware.ts`) — backend guards are the real gate. |

---

## 2. Existing Platform Primitives

| # | Primitive | Verdict | Evidence (cited) |
|---|---|---|---|
| 1 | **Auth** (JWT, lockout, MFA) | ✅ EXISTS | `JwtPayload` interface: `common/decorators/current-user.decorator.ts:3-15` (`sub, email, tenantId, roleId, permissions, firstName, lastName, employeeId, roleSlug`; `type` spliced in only at sign-time, `auth.service.ts:657,661` — see §0 correction). Lockout: `database/schema/users.ts:37,42-43` (`status`, `failedLoginAttempts`, `lockedUntil`); policy `auth.service.ts:23-24` (`MAX_LOGIN_ATTEMPTS=5`, `LOCK_DURATION_MINUTES=30`), logic `:87-97`. bcrypt `SALT_ROUNDS=12` — `auth.service.ts:22`. |
| 2 | **RBAC** | 🟡 PARTIAL | Action-level only. `common/permissions.constants.ts` (groups + `ROLE_PERMISSIONS`), `PermissionsGuard`, `@RequirePermissions`. `roles.hierarchyLevel` column exists (`database/schema/roles.ts:22`) but every reference found across `apps/api/src` is a **write** (seeds, tenant onboarding, role service) — confirmed **zero read-sites** (no `where`/`orderBy`/comparison). No field-level or generic record-level (own/team/territory/all) engine — only ESS `@ScopeToSelf` and a hand-rolled CRM own/all split via `crm:read_all`/`crm:assign`. |
| 3 | **Tenancy / RLS** | 🟡 PARTIAL | `tenant_id` ubiquitous; `TenantMiddleware` applied globally — `app.module.ts:156-158` (`consumer.apply(TenantMiddleware).forRoutes('*')`). `@CurrentTenant()` — `common/decorators/current-tenant.decorator.ts:6`. **Re-confirmed by direct search in this pass: zero matches for `ROW LEVEL SECURITY`/`CREATE POLICY` anywhere in `apps/api/src/database` or `deploy/`.** Isolation is manual `eq(tenantId)` per query only. **Highest platform risk — mechanism design for the fix is in `docs/crm/02-SCHEMA-MIGRATION-DESIGN.md` Part B.** |
| 4 | **Audit log** | ✅ EXISTS | Table `database/schema/audit-log.ts:30-42`. Interceptor `common/interceptors/audit.interceptor.ts:14` (`MUTATION_METHODS`), guard `:27-33`, insert `:53-67` — auto-logs POST/PUT/PATCH/DELETE. |
| 5 | **Notifications** | 🟡 PARTIAL | In-app (`schema/notifications.ts` + `shared/notification.service.ts`) + email listeners. No push/WebSocket/realtime, no SMS. |
| 6 | **File storage / attachments** | 🟡 PARTIAL | `@google-cloud/storage`, confirmed `modules/files/storage.service.ts:7` — **not MinIO** (CLAUDE.md now fixed). V4 signed URLs, tenant-prefixed keys. No polymorphic attachments table — files referenced ad hoc via `text[]` columns. |
| 7 | **Background jobs / queue** | 🟡 PARTIAL | BullMQ queue `scheduled-jobs` registered — `shared/queue.module.ts:6-8,21-23`. **Re-confirmed by direct search: zero `@Processor`/`WorkerHost`/`InjectQueue`/real `queue.add(` usages anywhere in `apps/api/src`** (the only `.add(` hits are unrelated `Set.add()` calls). Real recurring work is in-process `@Cron` — `shared/scheduled-jobs.service.ts`. |
| 8 | **Email (tenant SMTP)** | ✅ EXISTS | `shared/email.service.ts` + `smtp-settings.controller.ts`. Per-tenant, AES-256-GCM encrypted, nodemailer pool, `email_logs`. |
| 9 | **Numbering series** | ✅ EXISTS | `shared/number-series.service.ts`. Injected into `LeadService` (`modules/crm/lead/lead.service.ts:11,91` — import + constructor injection only) but **confirmed zero `.getNext(` calls in that file** — dead-injected dependency. Quotation numbering is a manual max+1 string instead. |
| 10 | **Custom-fields engine** | ❌ MISSING | Re-confirmed: zero matches for `customField`/`custom_fields`/`fieldDefinition` across `database/schema`. Design for the fix: `docs/crm/02-SCHEMA-MIGRATION-DESIGN.md` Part C. |
| 11 | **i18n** | 🟡 PARTIAL | `Intl`-based formatting only (`packages/utils/src/formatting.ts`). No string-translation framework. |

---

## 3. Existing ERP Entities Relevant to CRM (hand-off targets — reuse, don't rebuild)

| Entity | File / table (cited) | Reuse verdict |
|---|---|---|
| **Customer master** | `selling.ts:57-94` → `customers`: `customerNumber` (:62), `name` (:63), `taxId` (:69 — no `gstin`/`pan` columns), `contactId` (:86, **no `.references()` — unenforced FK**) | reuse-as-is (+ add structured `gstin`/`pan` — R7) |
| **Supplier** | `buying.ts:78-79,95-96` → `suppliers` HAS `panNumber varchar(10)`, `gstNumber varchar(15)`, dedicated indexes `suppliers_tenant_pan_idx`/`suppliers_tenant_gst_idx` | reuse-as-is |
| **Item / Product** | `inventory.ts:142-146` → `items`: `purchasePrice, sellingPrice, taxRate, hsnCode, defaultTaxRateId` | reuse-as-is (CRM lines point here, never a 2nd catalogue) |
| **Price List** | — | not-present (single `items.sellingPrice` only) |
| **Tax rates (GST)** | `finance.ts:460-464` → `tax_rates`: `rate, type, scope, isCompound, isInclusive` | reuse-as-is |
| **UOM** | `inventory.ts` → `unit_of_measure` enum | reuse-with-extension |
| **Currency / FX** | `finance.ts` → `currencies` (global), `exchange_rates` (tenant) | reuse-as-is |
| **Quotation** | `selling.ts:141,166` → `quotations` + `quotationLines` (in **selling**, not crm) | **reuse-as-is — CRM must not create a second quotation table** |
| **Sales Order** | `selling.ts:96,125` → `salesOrders` + `salesOrderLines` | reuse-as-is |
| **Invoice** | `finance.ts` → `invoices` + `invoice_lines` (full CGST/SGST/IGST columns) | reuse-as-is |
| **Payment** | `finance.ts` → `payments` + `payment_allocations` | reuse-as-is |
| **Territory** | — | not-present |
| **Sales Person / Team** | via `users` + `assignedTo`/`createdBy` | not-present as entity |

### Two critical hand-off findings (verified line-by-line)

- **Pricing/tax engine is duplicated across four places, not shared:**
  1. `selling/quotation/quotation.service.ts:113-130` — inline per-line math.
  2. `selling/sales-order/sales-order.service.ts:124-144` — near-identical duplicate.
  3. `selling/sales-order/sales-order.service.ts:336-417` (method starts `:285`) — `createInvoice()`, the **only** place doing the real CGST/SGST/IGST intra-/inter-state split, driven by a `companyState`/`customerState` comparison at `:324-326`.
  4. `finance/invoice/invoice.service.ts:121-162` — its own inline totals, and its manual `create()` path sets **`taxAmount = 0`** at line 130 (a `// TODO` next to it — a known bug, not a style choice).

  `packages/utils/src/financial.ts:10,36,64` exports `calculateTax`/`roundCurrency`/`calculateInvoiceTotal` — confirmed **zero imports** of any of them from either `modules/selling` or `modules/finance`. See the C6 characterization-test sequencing in `01-PHASE-1A-PLAN.md` §4 before any consolidation happens.

- **Conversion chain, partly built:** `DealService.convertToQuotation()` (`crm/deal/deal.service.ts:307-393`) sets `subtotal: dealValue.toFixed(4)` (:362), `taxAmount:'0'`, `discountAmount:'0'` (:363-364) — **confirmed no `quotationLines` insert anywhere in the method** (stub quality). `QuotationService.convertToSalesOrder()` (`selling/quotation/quotation.service.ts:240-321`) is solid and guards double-convert. No direct Deal→SO path exists; the real chain is Deal → Quotation → Sales Order → Invoice.

- **GSTIN/PAN:** `customers` has no `gstin`/`pan` column (only `taxId`). `business_settings` (the tenant's own company) has `gstNumber varchar(20)` and `panNumber varchar(15)` — `settings.ts:26-27` — used by `createInvoice` to derive place-of-supply against the *customer's* `billingState` string, not a structured customer GSTIN. → R7.

---

## 4. Gap Analysis — Full CRM Spec vs Reality

Legend: ✅ exists · 🟡 partial · ❌ missing · **Decision** = reuse / extend / build.

### 4.1 Data model
| Object | State | Decision |
|---|---|---|
| Lead | ✅ rich (telecalling fields, MCA registry, `lead_candidates` — `database/schema/crm.ts:381-393`) | extend (validation, scoring, web-capture) |
| **Organization / Account** | ❌ only free-text `company` | **BUILD** `organizations` (hierarchy, FK from contact/deal/lead, link to `customers`) |
| Contact | 🟡 single `email`/`phone`/`mobile` scalar columns (`crm.ts:114-116`), no org FK, no multi-value | extend |
| Deal | ✅ table exists | extend (stage table as source of truth, forecast fields) |
| **Pipeline / Stage** | 🟡 `deal_stages` table exists (`crm.ts:161-176`) **but `deals.stage` enum (`:187`) is what's actually used** — `getPipelineSummary` groups by the enum, not `stageId` (`deal.service.ts:261-277`) | **FIX** — see backfill plan in `01-PHASE-1A-PLAN.md` §5 |
| Quotation | ✅ in selling module | reuse |
| Activity / Task | ✅ CRUD, telecalling dispositions | extend (reminders, unified timeline) |
| **Campaign** | 🟡 table exists (`crm.ts:230-247`) but **confirmed zero references anywhere in `apps/api/src/modules`** — orphan | build minimal module or drop (Q7 default: keep) |
| **Territory / Sales Team / Quota** | ❌ | build |

### 4.2 Functional scope
| Capability | State | Decision |
|---|---|---|
| Lead manual create | ✅ | reuse |
| CSV/XLSX import w/ mapping, dry-run, rollback | 🟡 JSON import w/ identity-first dedupe (`lead.service.ts:313-319`); no server XLSX, no dry-run/rollback | extend |
| Web-to-Lead public endpoint | ❌ (all routes authed) | build |
| Duplicate detection | 🟡 import-only | extend |
| Merge | ❌ | build |
| Assignment engine | 🟡 round-robin + manual only | extend |
| Lead scoring | ❌ (field only) | build |
| Convert→Contact+**Org**+Deal | 🟡 makes contact+deal, no org | extend |
| Contact/Org 360° | 🟡 no org, no ERP read-through | build |
| Pipeline/Kanban | ❌ `deals/page.tsx` confirmed to use `DataTable` (`:8,148`), no board | build |
| Activities/tasks/reminders/queue/timeline | 🟡 CRUD + work queue ✅; reminders ❌ | extend |
| Email send + templates | ❌ (email is a logged activity type only) | build |
| WhatsApp/SMS/sequences | ❌ | build later |
| Quotation → ERP SO | 🟡 stub deal→quote; solid quote→SO | extend (real lines+tax via shared pricing, once C6 clears) |
| Reporting/forecasting | 🟡 pipeline summary only | build (custom-field-aware — §Part C of migration design) |
| Automation / assignment rules / SLA | ❌ | build (needs real queue workers — Phase 1b) |
| Custom fields / picklists / numbering | ❌/❌/🟡 unused | build (Phase 1b engine) + wire numbering |
| Consent/DPDP/suppression/masking/retention | ❌ | build |
| Mobile/offline | responsive web ✅ | later |
| Webhooks/public API | ❌ | build |

---

## 5. Risk List

| ID | Risk | Impact | Mitigation (amended) |
|---|---|---|---|
| **R1** | No RLS; tenant isolation manual per-query | Cross-tenant leak on any missed filter | **Amended (Q1):** RLS with `SET LOCAL` inside a request-scoped transaction (never `SET` — pooled `postgres` driver would leak tenant context across reused connections) + `FORCE ROW LEVEL SECURITY` (RLS is bypassed for the table-owning role otherwise). Full mechanism + 4 required isolation-suite cases (including a named pooled-connection-reuse test) in `02-SCHEMA-MIGRATION-DESIGN.md` Part B. Phase 1b, CRM-tables-first. |
| **R2** | No test harness | Spec's coverage/E2E goals impossible | vitest + disposable test DB, Phase 1a task 1a.1. |
| **R3** | Response envelope + pagination inconsistent | Frontend can't paginate by total | **Decided (owed):** new CRM endpoints only get `PaginatedResponse`/`ApiResponse`; the 84 existing non-CRM endpoints are untouched. Full blast-radius analysis and rationale in `01-PHASE-1A-PLAN.md` §2 — the frontend's `unwrap()` already makes this free for everything except total-count UI. |
| **R4** | Queue is a no-op (BullMQ wired, no workers) | Automations/SLA need real retries | Real producers/workers on the existing `BullModule`, Phase 1b. |
| **R5** | No custom-fields engine | Can't onboard a tenant without code | **Amended (Q4):** `custom_fields jsonb` + `field_definitions`, **plus a per-field B-tree expression index whenever `filterable`/`sortable`/`reportable` is set** (GIN alone doesn't serve range filters or sort). Custom fields ARE reportable in Phase 8 (constrains the schema now — `reportable` flag added). Dynamic `CREATE INDEX CONCURRENTLY` as a queued background job, not synchronous DDL. Full design: `02-SCHEMA-MIGRATION-DESIGN.md` Part C. |
| **R6** | Pricing/tax duplicated 4×, no shared engine | CRM quote would be a 5th copy; GST correctness risk | **Amended — explicitly sequenced, highest-risk item:** (1) test harness exists → (2) characterization tests pin all 4 implementations' *current* output against real fixtures → (3) extract only if they agree; if they diverge, **stop and present the divergence, no unilateral pick**. Full sequencing: `01-PHASE-1A-PLAN.md` §4. |
| **R7** | No structured customer GSTIN/PAN | Wrong CGST/SGST vs IGST on converted deals | Add `gstin`/`pan` to `customers` (mirror `suppliers`). |
| **R8** | Guards opt-in; UI gating client-only | IDOR risk if a decorator is forgotten | IDOR tests + a checklist; not exhaustively audited yet — see §0. |
| **R9** | Spec's §6 budgets vs free-tier e2-micro | Budgets physically unreachable on current infra | **Amended (Q3):** restated per-100k-rows against a **named** target (`db-custom-2-7680` Cloud SQL), benchmark harness moved to **Phase 1a**, not Phase 10, so regressions surface in the phase that causes them. Full table: `01-PHASE-1A-PLAN.md` §3. |
| **R10** | Two migration paths + duplicate `0004_` prefix | Drift / ordering hazard | **Fixed as a standalone commit** — the two orphan `0004`/`0005` files were confirmed redundant against the registered `0004_complex_whizzer.sql` (except two indexes, now applied directly and documented) and removed; `migrations/` now matches `meta/_journal.json` 1:1. **Remaining, separately tracked:** the schema drift accumulated since `0004_complex_whizzer` via `push --force` still needs to be captured as one reviewed migration — Phase 1a task 1a.2, design in `02-SCHEMA-MIGRATION-DESIGN.md` Part A. |
| **R11** | No polymorphic attachments table | Spec's attach-to-any-record unmet | Add `attachments(entity_type, entity_id, …)` reusing GCS `storage.service`. |
| **R12** | `hierarchyLevel` unused; no team/territory | Roll-up reporting blocked | Territory/team entity + wire hierarchy into record-level permissions. |

---

## 6. Proposed Module Layout

Unchanged from the original draft — backend extends `apps/api/src/modules/crm/` (no `crm_`-prefixed parallel infra); frontend extends `apps/web/src/app/(dashboard)/crm/**`. See the original layout tree; nothing in the amendments changed the shape, only the sequencing and mechanics of how it gets built.

```
modules/crm/
  organization/  contact/  lead/  deal/  pipeline/  activity/  quotation/
  campaign/  territory/  automation/  custom-field/  reporting/  compliance/  web-capture/
```
Shared platform additions: `modules/shared/pricing.service.ts` (post-C6-clearance), tenant-scoped query helper + RLS, `schema/attachments.ts`, real BullMQ workers.

---

## 7. Decisions (was "Open Questions" — now resolved with owner amendments)

1. **Tenant isolation (R1):** ✅ Approved — CRM-tables-first RLS with `SET LOCAL` + `FORCE ROW LEVEL SECURITY`, 4 named isolation-suite cases. Mechanism in `02-SCHEMA-MIGRATION-DESIGN.md` Part B. Platform-wide RLS retrofit remains a separate tracked follow-up.
2. **Migrations (R10):** ✅ Approved — versioned `generate`/`migrate` only going forward; duplicate-prefix bug **fixed now** (standalone commit); `deploy/*.sql` retired as an ORM-schema mechanism (the outstanding drift-capture is Phase 1a task 1a.2).
3. **Scope vs infra (R9):** ✅ Approved, amended — budgets restated per-100k-rows against the named `db-custom-2-7680` target; benchmark harness moved to **Phase 1a** (not Phase 10).
4. **Custom-fields storage (R5):** ✅ Approved, amended — jsonb + `field_definitions`, **plus per-field B-tree expression indexes** on filterable/sortable/reportable fields; **custom fields are reportable in Phase 8** (a `reportable` flag, restricted to aggregation-safe types, was added to the schema now for that reason).
5. **Account model & customer linkage (R7/§5.2):** ✅ Approved, amended — new `organizations` table; **a company-text dedupe/normalization pass runs and is reviewed before the FK is enforced** (free-text company names are messy); `organizations.customerId` is **nullable and unique**.

Bonus (unchanged, proceeding on default):
- Campaign orphan table: keep, build a minimal module.
- Response/pagination standard: **decided, not just defaulted** — see `01-PHASE-1A-PLAN.md` §2 (new CRM endpoints only, blast-radius analyzed).
- FPO Excel data: **pulled out of Phase 2 and completed as a standalone task** — see §9.

---

## 8. Phase Split

Original Phase 1 was five projects under one name. Split:

- **Phase 1a** (`docs/crm/01-PHASE-1A-PLAN.md`) — vitest harness + test DB, migration hygiene, response envelope + pagination convention, tenant-scoped query helper, benchmark harness, C6 characterization tests. **No CRM tables touched.** Ships and is reviewed on its own.
- **Phase 1b** (design previewed in `02-SCHEMA-MIGRATION-DESIGN.md` Parts B & C, plan document to follow after 1a ships) — RLS rollout + isolation suite, custom-field engine, option-set tables, BullMQ workers.
- **Phases 2-10** — unchanged from the original spec's phase table, now built on top of a foundation that actually has tests, real tenant isolation, and a settled API contract.

Standing rule for every phase from here on, not just 1a/1b: **every migration touching an existing table states its backfill and rollback plan before it ships** — see `01-PHASE-1A-PLAN.md` §5 for the policy and the two migrations (deal stage enum→FK, organizations dedupe) already named against it.

---

## 9. Carry-over: FPO Excel Data Load — Completed

Pulled out of Phase 2 per instruction and finished as a standalone task, not a phase sub-task. Verified directly against the production database (not assumed from memory): **2,799 leads** with FPO/FPC/Cooperative-shaped company names are live in the demo tenant, of which **320 have no phone number** — direct proof that the phone-optional, composite-dedupe import fix (`lead.service.ts` `importLeads`) was live and functioning correctly when this import ran, not just written and forgotten.

---

## 10. Exit Criteria for Phase 0

- [x] Stack/conventions inventoried with file:line citations (§1, §0)
- [x] Platform primitives inventoried with verdicts and re-verified citations (§2, §0)
- [x] ERP hand-off entities catalogued with citations (§3)
- [x] Gap analysis (§4)
- [x] Risk list with amended mitigations (§5)
- [x] Proposed module layout (§6)
- [x] Decisions recorded with owner amendments (§7)
- [x] Phase 1 split into 1a/1b (§8)
- [x] Could-Not-Verify section (§0)
- [x] Duplicate-migration-prefix bug fixed as its own commit (R10)
- [x] CLAUDE.md drift fixed as its own commit
- [x] FPO Excel load completed and verified (§9)
- [x] Response envelope decision made (not deferred mid-phase) — `01-PHASE-1A-PLAN.md` §2
- [ ] **Owner approval of Phase 1a plan (`01-PHASE-1A-PLAN.md`) and schema-first migration design (`02-SCHEMA-MIGRATION-DESIGN.md`)** ← awaiting

**No CRM feature code will be written until Phase 1a is approved and ships.**
