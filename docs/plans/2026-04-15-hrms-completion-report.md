# NexusERP HRMS Completion — Final Report

**Date:** 2026-04-15
**Branch:** feat/platform-core-finance
**Design:** docs/plans/2026-04-15-hrms-completion-design.md
**Plan:** docs/plans/2026-04-15-hrms-completion-plan.md

## Acceptance criteria (all met)

| Check | Result |
|---|---|
| `pnpm --filter @nexus-erp/api run build` | ✅ 0 TS errors |
| `pnpm --filter @nexus-erp/web run build` | ✅ 0 TS errors, 148+ routes emitted |
| Employee role redirected to `/ess` on login + blocked from `/dashboard/*` | ✅ `auth.store` redirect + `(dashboard)/layout.tsx` guard |
| HR-scoped sidebar (HR roles see only HR + admin sees all) | ✅ `requiredPrefix` filter on every nav group |
| ESS portal exists with self-scoped data | ✅ `(employee)/` route group + `@ScopeToSelf()` guard on every endpoint |

## Phase 1 — RBAC foundation (committed `9814528`)

- `users.employeeId` column bridges auth and HR
- JWT carries `employeeId` + `roleSlug` (login, refresh, MFA paths)
- `@ScopeToSelf()` decorator + `SelfScopedGuard` for ESS routes
- `apps/api/src/common/permissions.constants.ts` with full registry
- TenantOnboarding seeds 3 new roles per tenant: `hr_manager`, `hr_executive`, `employee`
- Frontend: User type carries `roleSlug`/`employeeId`; sidebar filters by `requiredPrefix`; dashboard layout redirects employees to `/ess`

## Phase 2 — Employee Self-Service portal (committed `125ec01`, `267cb3d`, `466487f`)

**17 ESS endpoints** under `@ScopeToSelf()`:

- Profile: `GET /ess/profile`, `PATCH /ess/profile` (whitelisted: phone/address/emergency contacts)
- Attendance: `GET /ess/attendance/today`, `GET /ess/attendance/me`, `POST check-in`, `POST check-out`
- Leave: `GET /ess/leave/balance`, `GET /POST /ess/leave/applications`, `POST /:id/withdraw`, `GET /team-calendar`
- Payroll: `GET /ess/payroll/entries`, `GET /:id/pdf` (streaming PDF via pdfkit)
- Expenses: `GET /POST /ess/expenses`
- Team: `GET /ess/team` (manager + peers + reports)
- Dashboard: `GET /ess/dashboard` (aggregated home)

**ESS pages** under `apps/web/src/app/(employee)/`:
- `layout.tsx` (minimal employee chrome)
- `ess/page.tsx` (dashboard with leave balance, today's attendance, latest payslip, pending expenses, announcements)
- `ess/profile/page.tsx`, `ess/attendance/page.tsx`, `ess/leave/page.tsx` + `apply` + `calendar`, `ess/payslips/page.tsx`, `ess/expenses/page.tsx` + `new`, `ess/team/page.tsx`, `ess/documents/page.tsx`, `ess/holidays/page.tsx`, `ess/performance/page.tsx`, `ess/announcements/page.tsx`

## Phase 3 — Missing HRMS modules (12 modules, ~16 commits)

| Module | Commits | What landed |
|---|---|---|
| **M1 Employee Documents** | `3f3a7d1` | `employee_documents` table + 6 doc types + HR upload + ESS read-only download |
| **M2 Announcements** | bundled in `52f0a77` | `announcements` + `announcement_reads` + audience scoping (tenant/dept/designation/specific) + read tracking |
| **M3 Holidays** | `ddbf8f9` | `holidays` table with regional support; HR calendar + ESS read-only |
| **M4 Performance** | `52f0a77` | 5 tables: review cycles, KRA templates, goals, review responses, competency ratings; full HR + ESS UI |
| **M5 Onboarding** | `3b02ae3` | Templates + checklists; auto-assigns on `hr.employee.created` event |
| **M5 Offboarding** | `f451fa4` | Mirror; auto-triggers on `dateOfLeaving` set |
| **M6 Org Chart** | inside `125ec01` | `GET /hr/employees/org-chart` recursive tree; frontend visualization |
| **M6 Asset Assignment** | `fd19432` | `asset_assignments` table + assign/return endpoints + employee-detail tab |
| **M7 Shifts** | `ea800c8` | `shifts` + `shift_assignments`; assignments auto-close prior open assignments |
| **M7 Attendance Policies** | `a96bbd4` | `attendance_policies` (grace/threshold/deduction); `computeLateDeductionsForMonth` exposed for payroll |
| **M8 Form 16** | `738fc15` | PDF generation aggregating payroll + tax declarations; FY-wide |
| **M8 Gratuity** | `235942d` | `gratuity_provisions`; formula `(lastBasic × 15 ÷ 26) × completedYears`; eligibility ≥ 5y |
| **M8 Statutory Reports** | `e6a0ab4` | PF return, ESI return, PT register, TDS quarterly — query endpoints + CSV export |
| **M9 HR Dashboard** | `812367c` | `GET /hr/dashboard` with 13 KPIs; full HR landing page |

## Phase 4 — Integration (committed `40e4dbe`)

The 10 parallel agents racing on shared files (`schema/index.ts`, `app.module.ts`, `lib/api.ts`) had stripped each one. Phase 4 restored them:

- **`schema/index.ts`**: re-exports all 25+ schemas including 8 new HR Phase-3 files
- **`app.module.ts`**: 27 modules wired (all umbrella domains + 12 HR sub-modules + platform/audit/integration/dashboard/shared/settings)
- **`finance.ts`**: added `recurringInvoiceTemplates` table that recurring-invoice service depended on
- **`AuditService`**: added `logSecurityEvent` + `getSecurityEvents` (referenced by auth/audit-controller); `userId` now optional
- **`apps/web/src/lib/utils.ts`**: added `displayAssignee` helper (CRM/helpdesk pages)
- **`apps/web/src/lib/api.ts`**: added 8 missing endpoint blocks — taxRates/currencies/fiscalPeriods/recurringInvoices/audit/securityEvents/retentionPolicies/legalHolds

## Manual step before exercising new flows

The schema additions need to be applied to the live DB:

```bash
pnpm --filter @nexus-erp/api db:generate
pnpm --filter @nexus-erp/api db:push
```

This creates 17 new tables across 8 new schema files:
- `employee_documents` + enum
- `announcements` + `announcement_reads` + enum
- `holidays` + enum
- 5 performance tables
- `onboarding_templates` + `onboarding_template_tasks` + `onboarding_checklists` + `onboarding_tasks` + offboarding mirrors (8 tables)
- `asset_assignments`
- `shifts` + `shift_assignments` + `attendance_policies`
- `gratuity_provisions`
- `recurring_invoice_templates`
- Plus column additions: `users.employee_id`

## Module roster (final state)

**HR Backend modules** (in `apps/api/src/modules/hr/`):
1. employee, attendance, leave, payroll, expense-claim, recruitment (existing)
2. announcement, employee-document, holiday, performance, onboarding, offboarding (new in Phase 3)
3. shift, attendance-policy, form-16, gratuity, statutory-reports, hr-dashboard (new in Phase 3)
4. Plus assets/asset-assignment (under assets module)

**Frontend ESS pages**: 13 routes
**Frontend HR-side pages**: ~50+ pages including new dashboard, performance, onboarding, offboarding, holidays, documents, announcements, shifts, attendance-policies, org-chart, reports/{pf-return,esi-return,pt-register,tds-quarterly,form-16,gratuity}, employees/[id]/assets

## Out of scope (deferred per design Section 6)

Training/courses (LMS), geo-fenced attendance, employee survey/pulse, succession planning, biometric/Slack integrations, mobile-app native build.

## Session commit log (HRMS portion)

```
40e4dbe fix(hrms-phase4): integration — wire all modules, restore schema barrel, fix audit api
fd19432 feat(hrms): asset assignment to employees with full lifecycle tracking
466487f feat(hrms/ess): employee portal layout, dashboard and module pages
267cb3d feat(hrms/ess): payslip PDF service
125ec01 feat(hrms/ess): backend endpoints with self-scoped guard
52f0a77 feat(hrms): performance management with cycles, goals, KRA templates, and reviews
f451fa4 feat(hrms): offboarding module with templates and exit workflow
3b02ae3 feat(hrms): onboarding module with templates and auto-assignment
3f3a7d1 feat(hrms): employee document management module + ESS document view
e6a0ab4 feat(hrms): statutory reports — PF, ESI, PT, TDS
235942d feat(hrms): gratuity provisioning calculator
738fc15 feat(hrms): Form 16 PDF generation
a96bbd4 feat(hrms): attendance policy with grace, late threshold, and deduction calculator
ea800c8 feat(hrms): shift management with assignments and weekend config
812367c feat(hrms): HR landing dashboard with operational KPIs
ddbf8f9 feat(hrms): holiday calendar with regional support
9814528 feat(hrms-phase1): RBAC foundation for ESS portal + HR-scoped UI
702d2e7 docs: HRMS completion implementation plan
e0764ca docs: HRMS completion design (ESS portal + HR-scoped UI + missing modules)
```
