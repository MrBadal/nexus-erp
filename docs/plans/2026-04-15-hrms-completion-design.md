# NexusERP HRMS Completion — Design

**Date:** 2026-04-15
**Status:** Approved
**Scope:** Employee Self-Service portal + HR-scoped UI + standard HRMS gaps (performance, onboarding, documents, announcements, org chart, asset assignment, shift management, Form 16, gratuity, late-deduction, statutory reports). Out of scope: training/courses, geo-fenced attendance, surveys, succession planning, biometric integrations.

---

## 1. RBAC architecture

Three new roles seeded per tenant:
- `employee` — `ess:read`, `ess:write` (forced `employeeId` scoping)
- `hr_manager` — full `hr:*`, `audit:read`
- `hr_executive` — `hr:read`, `hr:attendance:write`, `hr:leave:approve` (HR Manager minus payroll-write & onboarding-write)

**Bridge:** `users.employeeId uuid references employees.id` (add column if absent). All ESS endpoints look up `req.user.employeeId` and force `WHERE employeeId = :userEmpId`. Mismatched access → 403.

**Sidebar gating:** `apps/web/src/components/layout/sidebar.tsx` reads `useAuth().permissions` and renders only nav groups the user has any permission for.

**Login redirect:** `auth.store.ts` reads `user.role.slug`; `employee` → `/ess`, all others → `/dashboard`.

---

## 2. ESS routes (`apps/web/src/app/(employee)/`)

Dedicated route group with its own minimal layout.

| Route | Backend | Phase |
|---|---|---|
| `/ess` | aggregated home (greeting, balances, today, latest payslip, pending expenses, announcements) | 2 |
| `/ess/profile` | scoped employee read/limited update | 2 |
| `/ess/attendance` | scoped attendance + check-in/out + regularization | 2 |
| `/ess/leave` | scoped leave applications + balance | 2 |
| `/ess/leave/calendar` | team calendar | 2 |
| `/ess/payslips` | scoped payroll entries + new PDF endpoint | 2 |
| `/ess/expenses` | scoped expense claims | 2 |
| `/ess/documents` | scoped employee_documents (new module) | 3 |
| `/ess/holidays` | tenant holiday calendar (new module) | 3 |
| `/ess/team` | reports-to subtree | 2 |
| `/ess/performance` | scoped goals + self/manager review (new module) | 3 |
| `/ess/announcements` | scoped announcements feed (new module) | 3 |

---

## 3. HR-role experience

HR Manager sidebar (filtered): Dashboard · Employees · Org Chart · Departments · Attendance · Shifts · Leave · Payroll · Expense Claims · Recruitment · Onboarding · Performance · Documents · Announcements · Asset Assignment · HR Reports.

HR Executive sidebar = HR Manager minus payroll-write, salary-structure-write, onboarding-write.

**Approval inbox:** floating bell icon, unified queue of pending leave/expense/regularization/onboarding-task approvals routed to current user.

---

## 4. New HRMS modules (Phase 3)

| Module | New tables | Notes |
|---|---|---|
| Employee Documents | `employee_documents` | MinIO storage; types: offer_letter, contract, id_proof, certificate, payslip_archive; expiry alerts |
| Announcements | `announcements` | Audience: tenant/department/designation/explicit |
| Holidays | `holidays` | Regional support |
| Performance | `review_cycles`, `goals`, `review_responses`, `kra_templates`, `competency_ratings` | Cycle-based goals, self + manager review, 1-5 ratings |
| Onboarding | `onboarding_checklists`, `onboarding_tasks` | Template-based, auto-assigned on hire |
| Offboarding | `offboarding_checklists`, `offboarding_tasks` | Template-based, triggered on exit |
| Org Chart | none (computed from `employees.reportsTo`) | Visualization only |
| Asset Assignment | `asset_assignments` | Links existing assets module |
| Shifts | `shifts`, `shift_assignments` | Attendance enforces shift timing |
| Form 16 | none (computed from payroll + tax declarations) | PDF via existing `pdf.service.ts` |
| Gratuity | `gratuity_provisions` | (last basic × 15 ÷ 26) × years, eligible after 5y |
| Late-deduction | `attendance_policies` | grace + threshold + formula per tenant |
| Statutory reports | none (queries) | PF Form 12A/3A, ESI Form 5, PT register, TDS quarterly |

---

## 5. Phasing

| Phase | Duration | Approach |
|---|---|---|
| 1. RBAC foundation | 3-4d | Sequential, main agent |
| 2. ESS portal (existing-data) | 5-7d | Parallel: 2 agents (one ESS layout+routes, one backend scoping) |
| 3. HR-side new modules | 4-5w | Parallel: 6-8 agents, one per module/cluster |
| 4. Integration + smoke | 2d | Sequential, main agent |

Acceptance criteria:
- API + Web build: 0 TS errors
- Every new and existing HRMS page works end-to-end
- `employee` role attempts to hit `/dashboard/*` → redirected to `/ess`
- HR roles see only HR sidebar
- Demo flow: employee logs in → applies leave → sees balance decrement on approval → downloads payslip PDF → submits expense — fully isolated from internal modules

---

## 6. Out of scope (deferred)

Training/courses, geo-fenced attendance, employee survey/pulse, succession planning, biometric/Slack integrations, mobile-app native build.
