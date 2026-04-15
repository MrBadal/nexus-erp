# NexusERP Completeness Pass — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all verified backend defects and make every already-scaffolded frontend page work end-to-end.

**Architecture:** 11 cross-cutting backend fixes (done by main agent, sequential). 6 frontend-wiring subtasks dispatched in parallel to agents, each sandboxed to its own module directory. Integration pass: build both apps + smoke-click every top-level nav item.

**Tech Stack:** NestJS/Drizzle/Postgres backend, Next.js 15/React/TanStack Query/Tailwind frontend, pnpm + Turborepo monorepo.

**Verification base commands:**
- API build: `pnpm --filter @nexus-erp/api run build`
- Web build: `pnpm --filter @nexus-erp/web run build`
- Dev server (preview): `mcp__Claude_Preview__preview_start` then smoke-click

---

## Phase 1 — Backend cross-cutting defect fixes (sequential)

### Task 1: Recurring invoice uses NumberSeriesService

**Files:**
- Modify: `apps/api/src/modules/finance/recurring-invoice/recurring-invoice.module.ts` (add SharedModule import)
- Modify: `apps/api/src/modules/finance/recurring-invoice/recurring-invoice.service.ts` (inject NumberSeriesService, replace `REC-${Date.now()}` at line 102 with `await this.numberSeriesService.getNext(source.tenantId, 'invoice')`)

**Verify:** API build green. Grep confirms no `Date.now()` remains in that file.

**Commit:** `fix(finance): use NumberSeriesService for recurring invoice numbering`

---

### Task 2: Harden RCM / ITC account lookups (replace `LIKE '%rcm%'`)

**Files:**
- Modify: `apps/api/src/modules/finance/bill/bill.service.ts` (`postRcmJournal`, lookup by standard account code: input GST = `2310`, RCM liability = `2320`. Fall back to existing LIKE only if code miss, and log a warning.)
- Modify: `apps/api/src/modules/integration/integration.service.ts` (same pattern for any tax-account lookup in invoice GL posting)
- Add: constant file `apps/api/src/common/account-codes.constants.ts` with `INPUT_GST='2310'`, `RCM_LIABILITY='2320'`, `OUTPUT_GST='2210'`, `AR='1200'`, `AP='2100'`, `REVENUE='4000'`, `TDS_PAYABLE='2300'`, `DEPRECIATION_EXPENSE='6050'`, `ACCUM_DEPRECIATION='1600'`.

**Verify:** API build green. Search: `rg "LIKE '%rcm%'" apps/api` returns zero matches.

**Commit:** `refactor(finance): use canonical account codes for RCM/ITC lookups`

---

### Task 3: RA Bill mobilisation-advance deduction

**Files:**
- Modify: `apps/api/src/modules/construction/ra-bill/ra-bill.service.ts`:
  - In `create()`: after computing `netPayable`, query `contracts.mobilisationAdvance` and sum `raBills.advanceAdjusted` for prior bills on same contract. Deduct per-bill share (pro-rata over expected bill count, or flat % of this bill — use `contract.advanceRecoveryPercent` column; add if absent).
  - Store `advanceAdjusted` on the RA bill row.
- Modify: `apps/api/src/database/schema/construction.ts` — add `advanceAdjusted decimal(20,4) default '0'` column to `raBills` + `advanceRecoveryPercent decimal(5,2) default '10'` to `contracts`. Migration via drizzle-kit.

**Verify:** API build green. Create test contract with 10% advance + run 2 RA bills — advance recovery totals match manual calc.

**Commit:** `fix(construction): deduct mobilisation advance from RA Bill net payable`

---

### Task 4: Wire tickets → SLA

**Files:**
- Modify: `apps/api/src/database/schema/helpdesk.ts` — add `slaId uuid references(() => slaPolicies.id)` column to `tickets`.
- Modify: `apps/api/src/modules/helpdesk/ticket/ticket.service.ts` — on create, auto-select SLA by priority+tenant; on status transitions, calculate `firstResponseDueAt` / `resolutionDueAt`.
- Modify: `apps/api/src/modules/shared/scheduled-jobs.service.ts` — add hourly job scanning open tickets past due → emit `TICKET_SLA_BREACHED`.

**Verify:** API build green. Migration applied via drizzle-kit push.

**Commit:** `feat(helpdesk): attach SLA to tickets and detect breaches`

---

### Task 5: Real MFA TOTP

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts` — replace the TODO placeholder with `speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token, window: 1 })`. Add `speakeasy` to `apps/api/package.json` if absent.
- Modify: `apps/api/src/modules/auth/auth.service.ts` — `enableMfa()` returns `otpauth_url` + QR seed.

**Verify:** API build green. New method emits a valid `otpauth://` URL.

**Commit:** `fix(auth): implement real TOTP verification for MFA`

---

### Task 6: Invalidate password-reset tokens after use

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts` `resetPassword()` — after successful update, `UPDATE passwordResetTokens SET usedAt = NOW() WHERE token = $1`. Reject any token where `usedAt IS NOT NULL`.

**Verify:** API build green. Reusing same token returns 400.

**Commit:** `fix(auth): invalidate password-reset tokens after first use`

---

### Task 7: Approval-workflow wiring on PO / Bill / Expense

**Files:**
- Modify: `apps/api/src/modules/buying/purchase-order/purchase-order.service.ts` — on `submit()`, call `approvalService.submitForApproval({ documentType: 'purchase_order', documentId: po.id, tenantId, requestedBy: userId, amount: po.total })`.
- Modify: `apps/api/src/modules/finance/bill/bill.service.ts` — same on `submit()` / before `approve()`.
- Modify: `apps/api/src/modules/hr/expense-claim/expense-claim.service.ts` — same on `submit()`.
- Modify: `apps/api/src/modules/shared/approval-workflow.service.ts` — on `APPROVAL_COMPLETED` event, call back into originating service to transition status.

**Verify:** API build green. Creating a PO above threshold returns status `pending_approval`.

**Commit:** `feat(approvals): wire workflow engine into PO/Bill/Expense submit`

---

### Task 8: Audit logging on role/permission CRUD

**Files:**
- Modify: `apps/api/src/modules/rbac/role/role.service.ts` — inject `AuditService`. Log `create`, `update`, `delete`, `assignPermission`, `revokePermission` with diffs.

**Verify:** API build green.

**Commit:** `feat(audit): log role and permission CRUD`

---

### Task 9: Retention-policy archival scheduled job

**Files:**
- Modify: `apps/api/src/modules/shared/scheduled-jobs.service.ts` — new `@Cron('0 2 * * *')` daily at 02:00 that iterates active retention policies, queries docs older than `retentionDays`, moves to archive table (or sets `archivedAt`). Skip any under legal hold.

**Verify:** API build green. Manual invoke via NestJS scheduler emits expected logs.

**Commit:** `feat(retention): add nightly archival job honoring legal holds`

---

### Task 10: Manufacturing WO shortage check + FG auto-stock

**Files:**
- Modify: `apps/api/src/modules/manufacturing/work-order/work-order.service.ts` `start()` — before marking `in_progress`, sum required BOM materials × WO qty; query `itemWarehouses` for each; reject with 400 if any short.
- Modify: `apps/api/src/modules/integration/integration.service.ts` `onWorkOrderCompleted()` — after consuming raw, INSERT finished-goods `stockMovement` (type `receipt`) + increment `itemWarehouses.quantity` at WO's target warehouse, using BOM-cost-based unit cost.

**Verify:** API build green. Completing a WO with 10 units of FG X increases `itemWarehouses.quantity` for FG X by 10.

**Commit:** `feat(manufacturing): add shortage check and finished-goods stock posting`

---

### Task 11: Quality GRN→QC gate + reject-to-quarantine

**Files:**
- Modify: `apps/api/src/modules/quality/inspection/inspection.service.ts` — on create, require `referenceType='purchase_receipt'` and valid `referenceId` for incoming inspections; create a `stockMovement` (type `transfer`) that moves rejected qty to a quarantine warehouse (auto-create if absent with code `QUARANTINE`).
- Emit event `INSPECTION_REJECTED` → listener in `integration.service.ts` does the stock move.

**Verify:** API build green.

**Commit:** `feat(quality): quarantine rejected stock on inspection rejection`

---

## Phase 2 — Parallel frontend page-wiring (6 agents, dispatched concurrently)

### Task 12: Dispatch 6 frontend-wiring agents in parallel

Each agent receives this prompt template (substitute `{MODULES}`):

> You are fixing broken/incomplete frontend pages for the NexusERP monorepo. **Your sandbox:** `apps/web/src/app/(dashboard)/{MODULES}/**` and the corresponding `apps/web/src/hooks/use-*.ts` files. **Do not** modify schema, backend, shared components, `app/layout.tsx`, or any module outside your sandbox. **Do not** invent new API endpoints — only use endpoints registered in `apps/web/src/lib/api.ts`. For every page (list, create, edit, detail), verify: loads without crash, form submits successfully, cross-module links navigate, empty state renders when no data. Fix any issue found. Return a per-page status table and a file-changes list. Do NOT apply cosmetic-only changes.

| Agent | `{MODULES}` |
|---|---|
| F | `finance` |
| B | `buying` |
| S | `selling` |
| O | `inventory`, `manufacturing`, `quality`, `projects` |
| H | `hr`, `crm`, `helpdesk`, `assets` |
| C | `construction`, `settings` |

**Verify:** After all return, run `pnpm --filter @nexus-erp/web run build`. Zero TypeScript errors.

**Commit (per agent result):** `fix(<module>): wire pages and forms to existing endpoints`

---

## Phase 3 — Integration pass (main agent)

### Task 13: Build both apps

Run:
```bash
pnpm --filter @nexus-erp/api run build
pnpm --filter @nexus-erp/web run build
```
Fix any TypeScript errors introduced by Phase 1 or 2.

### Task 14: Smoke-click every top-level nav item

Start dev server with Claude Preview MCP. Navigate to each top-level module: dashboard, finance, buying, selling, inventory, manufacturing, quality, projects, hr, crm, helpdesk, assets, construction, settings. For each: open list → open detail of first item (or confirm empty state) → exercise primary action (e.g. create draft). Record status. Fix any crash.

### Task 15: Final report

Produce a table:
- Per-defect status (1–11): fixed / deferred / blocked
- Per-module page status: working / broken / not-tested
- Remaining TODOs for a follow-up session
