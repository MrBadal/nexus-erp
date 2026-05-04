# HRMS Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver complete HRMS — Employee Self-Service portal, HR-scoped role experience, and the 13 missing HRMS modules — across a single multi-tenant NestJS+Next.js codebase.

**Architecture:** Frontend-first reuse of existing HR backend for ESS (Phase 2), then parallel backend+frontend additions for the missing modules (Phase 3). RBAC foundation up front (Phase 1) keeps every later task small.

**Tech Stack:** NestJS / Drizzle / Postgres / Next.js 15 (App Router) / TanStack Query / Tailwind / shadcn/ui / MinIO (object storage) / pdfkit (already in deps).

**Verification commands** (run after each task):
- API: `pnpm --filter @nexus-erp/api run build`
- Web: `pnpm --filter @nexus-erp/web run build`
- Smoke: dev server + click each new route

---

## Phase 1 — RBAC foundation (sequential, ~3-4 days, main agent)

### Task 1: Add `users.employeeId` link

**Files:**
- Modify: `apps/api/src/database/schema/auth.ts` (or wherever `users` table is defined)
- Modify: tenant-onboarding seed to also seed default `employee` employee row when an admin user is created

**Steps:**
1. Add column `employeeId uuid references(() => employees.id)` (nullable) to `users`.
2. `pnpm --filter @nexus-erp/api db:generate && db:push`.
3. Verify build green.

**Commit:** `feat(auth): add users.employeeId link to bridge auth and HR`

---

### Task 2: Seed `employee`, `hr_manager`, `hr_executive` roles

**Files:**
- Modify: `apps/api/src/modules/shared/tenant-onboarding.service.ts`
- Add: permission registry to `apps/api/src/common/permissions.constants.ts`

**Permission groups** (literal strings stored in `roles.permissions` JSONB array):
- ESS: `ess:read`, `ess:write`, `ess:apply_leave`, `ess:submit_expense`, `ess:check_in`
- HR Manager: `hr:read`, `hr:write`, `hr:approve_leave`, `hr:approve_expense`, `hr:run_payroll`, `hr:manage_recruitment`, `hr:manage_performance`, `hr:manage_onboarding`, `hr:post_announcement`, `hr:manage_documents`, `audit:read`
- HR Executive: `hr:read`, `hr:attendance:write`, `hr:approve_leave`, `hr:approve_expense`, `hr:manage_recruitment`

Seed each role on tenant creation. Existing tenants seeded via a one-time migration script.

**Verify:** `SELECT slug, permissions FROM roles WHERE tenant_id = '<demo>'` returns 4 rows (admin + 3 new).

**Commit:** `feat(rbac): seed employee, hr_manager, hr_executive default roles`

---

### Task 3: `@SelfScopedGuard` decorator + ESS controller pattern

**Files:**
- Create: `apps/api/src/common/guards/self-scoped.guard.ts`
- Create: `apps/api/src/common/decorators/scope-to-self.decorator.ts`

**Behavior:** When `@ScopeToSelf()` is on a route, guard reads `req.user.employeeId` and attaches to `req.scopedEmployeeId`. Service methods receive `scopedEmployeeId` and force the `WHERE` clause. If `req.user.employeeId` is null (admin user without employee row), return 400 "User not linked to an employee record".

**Commit:** `feat(rbac): add SelfScopedGuard + ScopeToSelf decorator`

---

### Task 4: Login redirect logic

**Files:**
- Modify: `apps/web/src/stores/auth.store.ts` (after successful login, route based on role.slug)
- Modify: `apps/web/src/app/(auth)/login/page.tsx`

**Code:**
```ts
// In login success handler
if (user.role?.slug === 'employee') router.push('/ess');
else router.push('/dashboard');
```

**Commit:** `feat(auth): redirect employee role to ESS portal on login`

---

### Task 5: Sidebar gating by permissions

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`

**Behavior:** Each nav group declares a `requiredPermissions: string[]`. Group renders only if `user.permissions` overlaps. HR groups require any of `hr:*`. Finance groups require `finance:*`. Etc. Use a small helper `hasAny(userPerms, required)`.

**Commit:** `feat(ui): gate sidebar nav groups by user permissions`

---

### Task 6: Block `employee` role from `/dashboard/*`

**Files:**
- Modify: `apps/web/src/app/(dashboard)/layout.tsx` — read auth, if role.slug === 'employee', redirect to /ess.

**Commit:** `feat(rbac): block employee role from internal dashboard routes`

---

## Phase 2 — ESS portal (parallel, ~5-7 days, 2 agents)

### Task 7: ESS layout + dashboard route

**Agent:** Frontend ESS-A
**Files (create all):**
- `apps/web/src/app/(employee)/layout.tsx` — minimal layout: top bar with employee name + logout, no sidebar (or compact left rail with 8 icons)
- `apps/web/src/app/(employee)/ess/page.tsx` — dashboard with cards: leave balance, today's attendance, latest payslip, pending expenses, announcements
- `apps/web/src/components/ess/header.tsx` — top bar
- `apps/web/src/components/ess/nav-rail.tsx` — left icon rail
- `apps/web/src/hooks/use-ess.ts` — wrapper hooks calling new ESS endpoints

**Commit:** `feat(ess): scaffold employee portal layout + dashboard`

---

### Task 8: ESS profile page

**Agent:** Frontend ESS-A
**Files:**
- Create: `apps/web/src/app/(employee)/ess/profile/page.tsx`

**Allowed edit fields:** `phone`, `currentAddress`, `emergencyContactName`, `emergencyContactPhone`. Read-only: name, dateOfBirth, employeeId, doj, designation, department, salary structure, PAN, Aadhaar, UAN, ESIC.

**Backend:** new endpoint `PATCH /ess/profile` calls `EmployeeService.update()` with field whitelist guarded by `@ScopeToSelf()`.

**Commit:** `feat(ess): profile view + limited self-update`

---

### Task 9: ESS attendance (check-in/out + history + regularization)

**Agent:** Frontend ESS-A
**Files:**
- Create: `apps/web/src/app/(employee)/ess/attendance/page.tsx`
- Modify: `apps/api/src/modules/hr/attendance/attendance.controller.ts` — add `GET /ess/attendance/today`, `GET /ess/attendance/me`, `POST /ess/attendance/check-in`, `POST /ess/attendance/check-out`, `POST /ess/attendance/regularization` (creates a regularization request that HR approves)

**Schema add:** `attendance_regularizations` table or reuse existing attendance status field with a new `pending_regularization` value.

**Commit:** `feat(ess): attendance check-in/out + history + regularization`

---

### Task 10: ESS leave (apply + balance + history + withdraw)

**Agent:** Frontend ESS-A
**Files:**
- Create: `apps/web/src/app/(employee)/ess/leave/page.tsx`
- Create: `apps/web/src/app/(employee)/ess/leave/apply/page.tsx`
- Create: `apps/web/src/app/(employee)/ess/leave/calendar/page.tsx`
- Modify: `leave.controller.ts` — add `GET /ess/leave/balance`, `GET /ess/leave/applications`, `POST /ess/leave/applications`, `POST /ess/leave/applications/:id/withdraw`, `GET /ess/leave/team-calendar`

**Commit:** `feat(ess): leave apply, balance, history, team calendar`

---

### Task 11: ESS payslips with PDF download

**Agent:** Frontend ESS-A + Backend ESS-B
**Files:**
- Create: `apps/web/src/app/(employee)/ess/payslips/page.tsx`
- Modify: `payroll.controller.ts` — add `GET /ess/payroll/entries`, `GET /ess/payroll/entries/:id/pdf` (returns Buffer)
- Create: `apps/api/src/modules/hr/payroll/payslip-pdf.service.ts` — uses `pdfkit` to render payslip with company header, employee details, earnings breakdown, deductions breakdown, statutory summary

**Commit:** `feat(ess): payslip list and PDF download`

---

### Task 12: ESS expense claims (submit + history)

**Agent:** Frontend ESS-A
**Files:**
- Create: `apps/web/src/app/(employee)/ess/expenses/page.tsx`
- Create: `apps/web/src/app/(employee)/ess/expenses/new/page.tsx`
- Modify: `expense-claim.controller.ts` — add ESS-scoped endpoints

**Commit:** `feat(ess): expense submission and history`

---

### Task 13: ESS team view (org subtree)

**Agent:** Frontend ESS-A
**Files:**
- Create: `apps/web/src/app/(employee)/ess/team/page.tsx`
- Modify: `employee.controller.ts` — add `GET /ess/team/me` returning manager + peers + reports

**Commit:** `feat(ess): personal team view`

---

## Phase 3 — Missing HRMS modules (parallel, ~4-5 weeks, 8 agents)

Each agent below is a self-contained module. Dispatched in parallel after Phase 2 completes.

### Agent M1: Employee Documents

**New schema:** `apps/api/src/database/schema/hr.ts` — table `employeeDocuments` (id, tenantId, employeeId, type enum, name, fileUrl, fileSize, expiresAt, uploadedBy, uploadedAt, visibleToEmployee bool).

**Backend module:** `apps/api/src/modules/hr/employee-document/` — full CRUD; PDF/image upload via existing MinIO config.

**Frontend:**
- HR side: `apps/web/src/app/(dashboard)/hr/documents/page.tsx` (list, upload per employee)
- ESS: `apps/web/src/app/(employee)/ess/documents/page.tsx` (read-only, only `visibleToEmployee=true`)

**Commit:** `feat(hr/documents): employee document management with MinIO storage`

---

### Agent M2: Announcements

**New schema:** `announcements` (id, tenantId, title, body, audienceScope enum, audienceIds[], publishedAt, expiresAt, createdBy).

**Backend:** `apps/api/src/modules/hr/announcement/` — CRUD + audience filter.

**Frontend:**
- HR side: `hr/announcements/page.tsx` (post, edit, list)
- ESS: feed widget on `/ess` dashboard + dedicated `/ess/announcements/page.tsx`

**Commit:** `feat(hr/announcements): company-wide and scoped announcements`

---

### Agent M3: Holidays

**New schema:** `holidays` (id, tenantId, date, name, type enum, regions[]).

**Backend:** `apps/api/src/modules/hr/holiday/` — CRUD; integration: leave service excludes holidays from working-day count.

**Frontend:**
- HR side: `hr/holidays/page.tsx` (calendar view)
- ESS: `/ess/holidays/page.tsx` (read-only)

**Commit:** `feat(hr/holidays): regional holiday calendar`

---

### Agent M4: Performance Management

**New schema:**
- `reviewCycles` (id, tenantId, name, startDate, endDate, status)
- `kraTemplates` (id, tenantId, designationId, kras jsonb)
- `goals` (id, tenantId, employeeId, cycleId, title, weight, target, status)
- `reviewResponses` (id, cycleId, employeeId, reviewerId, role enum 'self|manager|peer', responses jsonb, rating)

**Backend:** `apps/api/src/modules/hr/performance/` — full CRUD + cycle workflow.

**Frontend:**
- HR side: `hr/performance/page.tsx` + cycles + templates + review-queue
- ESS: `/ess/performance/page.tsx` (own goals, self-review, view manager feedback)

**Commit:** `feat(hr/performance): cycle-based reviews with goals and KRAs`

---

### Agent M5: Onboarding & Offboarding

**New schema:**
- `onboardingTemplates` + `onboardingTemplateTasks`
- `onboardingChecklists` (id, employeeId, templateId, status) + `onboardingTasks` (assignedTo, status, dueDate)
- Same for offboarding

**Backend:** `apps/api/src/modules/hr/onboarding/`, `apps/api/src/modules/hr/offboarding/`

**Frontend:**
- HR side: template builder + active checklists kanban view
- Auto-creates onboarding checklist on employee creation; offboarding on `dateOfExit` set

**Commit:** `feat(hr/onboarding): template-driven onboarding and offboarding`

---

### Agent M6: Org Chart + Asset Assignment

**Org Chart:**
- No new schema (uses existing `employees.reportsTo`).
- Frontend: `hr/org-chart/page.tsx` using react-flow or a simple recursive tree.

**Asset Assignment:**
- New schema: `assetAssignments` (id, tenantId, assetId, employeeId, assignedAt, returnedAt, conditionAtAssign, conditionAtReturn, notes)
- Backend: `apps/api/src/modules/assets/asset-assignment/`
- Frontend: HR side on employee detail page → "Assigned Assets" tab with assign/unassign actions; ESS shows employee's currently-assigned assets.

**Commit:** `feat(hr): org chart visualization + asset-to-employee assignment`

---

### Agent M7: Shift Management + Late-Deduction

**Shifts:**
- New schema: `shifts` (id, tenantId, name, startTime, endTime, breakMinutes, weekendDays[]) + `shiftAssignments` (id, employeeId, shiftId, effectiveFrom, effectiveTo)
- Backend: `apps/api/src/modules/hr/shift/`
- Attendance check-in: validates against assigned shift; flags `late=true` if past start+grace.

**Late-Deduction:**
- New schema: `attendancePolicies` (id, tenantId, graceMinutes, lateThresholdMinutes, deductionPerInstance decimal, monthlyToleranceCount)
- Cron: monthly job sums late-instances per employee, applies deduction to next payroll.

**Frontend:**
- HR side: `hr/shifts/page.tsx`, `hr/attendance-policies/page.tsx`

**Commit:** `feat(hr): shift management + automated late-deduction policy`

---

### Agent M8: Form 16, Gratuity, Statutory Reports

**Form 16:**
- New endpoint `GET /hr/payroll/form-16/:employeeId/:fy` returns PDF (Part A + Part B)
- Aggregates payroll-entries + tax-declarations for the FY.

**Gratuity:**
- New schema: `gratuityProvisions` (id, tenantId, employeeId, fy, lastBasic, completedYears, gratuityAmount, providedAt)
- Service: monthly cron computes provision for eligible employees (≥5 yrs); formula `lastBasic × 15 ÷ 26 × completedYears`; posts JE: DR Gratuity Expense / CR Gratuity Provision Liability.

**Statutory reports:**
- New endpoints under `apps/api/src/modules/hr/statutory-reports/`:
  - `GET /hr/reports/pf-return/:fy/:month` (Form 12A/3A data)
  - `GET /hr/reports/esi-return/:fy/:month` (Form 5)
  - `GET /hr/reports/pt-register/:fy/:month`
  - `GET /hr/reports/tds-quarterly/:fy/:quarter`
- Frontend: `hr/reports/page.tsx` index + per-report pages with date selectors and download buttons.

**Commit (3 separate):**
- `feat(hr): Form 16 generation`
- `feat(hr): gratuity provisioning with monthly cron and GL posting`
- `feat(hr): statutory reports — PF, ESI, PT, TDS`

---

### Agent M9 (optional): HR Dashboard

**File:** `apps/web/src/app/(dashboard)/hr/page.tsx` (the HR landing)

**Cards:**
- Total active employees, on leave today, attendance % current month
- Pending leave approvals, pending expense approvals, pending regularization
- Upcoming birthdays (next 7 days), upcoming work anniversaries
- Open job openings with applicant counts
- Onboarding checklists in progress, overdue tasks
- New endpoint `GET /hr/dashboard` returns aggregated KPIs

**Commit:** `feat(hr): HR landing dashboard with operational KPIs`

---

## Phase 4 — Integration pass (~2 days, main agent)

### Task 14: Build both apps

```bash
pnpm --filter @nexus-erp/api run build
pnpm --filter @nexus-erp/web run build
```

Fix any TS errors from agent overlap.

### Task 15: Smoke-click every HRMS route

Login as `admin@demo` (HR Manager equivalent) → navigate every HR sidebar item.
Login as a seeded `employee@demo` → navigate every `/ess/*` route.
Verify no crashes, no 500s, no demo data fallbacks.

### Task 16: Final report

Per-task status table + per-page status table + Drizzle migration command needed.

---

## Verification (after each phase)

- API build: 0 errors
- Web build: 0 errors
- Migration: `pnpm --filter @nexus-erp/api db:generate && pnpm --filter @nexus-erp/api db:push`
- Smoke: log in, navigate, no crashes

---

## Out of scope (explicitly deferred)

Training/courses, geo-fenced check-in, surveys/pulse, succession planning, biometric integration, Slack/Zoom/email-bot integrations, mobile-app native build.
