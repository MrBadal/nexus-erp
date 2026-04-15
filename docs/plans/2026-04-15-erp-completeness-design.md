# NexusERP Completeness Pass — Design

**Date:** 2026-04-15
**Status:** Approved
**Scope boundary:** Fix every verified defect + make every already-scaffolded page work end-to-end. No new modules, reports, PDFs, or e-invoicing.

---

## 1. Definition of done

1. `pnpm --filter @nexus-erp/api run build` → 0 TypeScript errors
2. `pnpm --filter @nexus-erp/web run build` → 0 TypeScript errors
3. Every top-level dashboard nav item loads real data or a clean empty state — no crashes, 500s, or "Cannot GET" on any existing page
4. Every verified defect below has a code diff

## 2. Verified defects (cross-cutting, owner = me)

| # | Defect | File(s) |
|---|---|---|
| 1 | Recurring invoice uses `REC-${Date.now()}` | `apps/api/src/modules/finance/recurring-invoice/recurring-invoice.service.ts` + its `.module.ts` |
| 2 | RCM/ITC account lookups use `LIKE '%rcm%'` (fragile) | `apps/api/src/modules/finance/bill/bill.service.ts`, `apps/api/src/modules/integration/integration.service.ts` |
| 3 | RA Bill never deducts contract `mobilisationAdvance` | `apps/api/src/modules/construction/ra-bill/ra-bill.service.ts` |
| 4 | Helpdesk tickets have no `sla_id` FK — SLA subsystem dormant | `apps/api/src/database/schema/helpdesk.ts` + `ticket.service.ts` + listener |
| 5 | MFA TOTP is placeholder — no real verification | `apps/api/src/modules/auth/auth.service.ts` |
| 6 | Password-reset tokens not invalidated after use | `apps/api/src/modules/auth/auth.service.ts` |
| 7 | Approval workflow injected but never called from PO/Bill/Expense create | 3 services |
| 8 | No audit logging on role/permission CRUD | `apps/api/src/modules/rbac/role/role.service.ts` |
| 9 | Retention policies have no scheduled archival job | `apps/api/src/modules/shared/scheduled-jobs.service.ts` |
| 10 | Manufacturing WO lacks pre-start material shortage check + no FG auto-stock on completion | `work-order.service.ts` + `integration.service.ts` |
| 11 | Quality rejection doesn't auto-quarantine stock; no GRN → QC gate | `inspection.service.ts` + `integration.service.ts` |

## 3. Frontend page wiring (owner = parallel agents)

Six agents, one per module group. Each has a hard contract:

> Open every page in `apps/web/src/app/(dashboard)/<your-module>/`. For each page, verify: list loads real API data, create form submits, edit form saves, delete works, detail page renders, cross-module links navigate. Fix anything that crashes or 500s by wiring to an existing endpoint in `apps/web/src/lib/api.ts`. **Do NOT invent backend endpoints. Do NOT touch schema. Do NOT touch any file outside your module directory or its `use-<module>.ts` hook file.** Return a per-page status table.

| Agent | Module directories |
|---|---|
| F | `finance/` |
| B | `buying/` |
| S | `selling/` |
| O | `inventory/`, `manufacturing/`, `quality/`, `projects/` |
| H | `hr/`, `crm/`, `helpdesk/`, `assets/` |
| C | `construction/`, `settings/` |

## 4. Risk & conflict control

- Each agent is sandboxed to its own directory — zero file-level conflicts.
- Cross-cutting edits (integration.service.ts, schema) are mine only; no agent touches them.
- Agent scope forbids backend endpoint creation, so agents can't diverge from API reality.
- If an agent invents an endpoint, I revert and note in the final report.

## 5. Execution flow

1. I fix defects 1–11 (sequential, one file at a time).
2. Halfway through, dispatch the six agents in parallel (they run while I finish).
3. Build `api` + `web`. Fix any TypeScript errors.
4. Start dev server (`preview_start`). Click through every top-level nav item. Fix crashes.
5. Final report with per-defect + per-page status.

## 6. Out of scope (explicitly deferred)

- New modules (Form 16, gratuity, lead scoring, recruitment, budget alerts UI, notification bell UI, workflow designer UI)
- New reports (Balance Sheet, Aging, TDS Register, GST returns)
- PDF generation
- E-invoice IRN/QR
- Batch/serial tracking (schema change)
- Bank CSV import
- Multi-currency FX job
