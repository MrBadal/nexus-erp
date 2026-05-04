/**
 * Canonical permission strings used across the codebase.
 *
 * Convention: `<domain>:<action>[:<scope>]`
 *   - domain: hr, finance, buying, selling, inventory, …, ess (employee self-service)
 *   - action: read, write, approve, delete, *
 *   - scope (optional): leave, expense, payroll, etc. — used when a role gets a
 *     subset within a domain (e.g. hr_executive can approve leave but not payroll-write).
 *
 * Wildcard: `<domain>:*` grants every action in that domain.
 * Super-admin: `*` grants everything (admin role).
 */

// ─── Employee Self-Service ──────────────────────────────────────
export const ESS_PERMS = {
  READ: 'ess:read',
  WRITE: 'ess:write',
  APPLY_LEAVE: 'ess:apply_leave',
  SUBMIT_EXPENSE: 'ess:submit_expense',
  CHECK_IN: 'ess:check_in',
} as const;

// ─── HR ─────────────────────────────────────────────────────────
export const HR_PERMS = {
  READ: 'hr:read',
  WRITE: 'hr:write',
  ATTENDANCE_WRITE: 'hr:attendance:write',
  APPROVE_LEAVE: 'hr:approve_leave',
  APPROVE_EXPENSE: 'hr:approve_expense',
  RUN_PAYROLL: 'hr:run_payroll',
  MANAGE_RECRUITMENT: 'hr:manage_recruitment',
  MANAGE_PERFORMANCE: 'hr:manage_performance',
  MANAGE_ONBOARDING: 'hr:manage_onboarding',
  POST_ANNOUNCEMENT: 'hr:post_announcement',
  MANAGE_DOCUMENTS: 'hr:manage_documents',
  MANAGE_SHIFTS: 'hr:manage_shifts',
} as const;

// ─── Audit ──────────────────────────────────────────────────────
export const AUDIT_PERMS = {
  READ: 'audit:read',
} as const;

// ─── Default permission sets per seeded role ────────────────────
export const ROLE_PERMISSIONS = {
  admin: ['*'],
  employee: [
    ESS_PERMS.READ,
    ESS_PERMS.WRITE,
    ESS_PERMS.APPLY_LEAVE,
    ESS_PERMS.SUBMIT_EXPENSE,
    ESS_PERMS.CHECK_IN,
  ],
  hr_manager: [
    HR_PERMS.READ,
    HR_PERMS.WRITE,
    HR_PERMS.ATTENDANCE_WRITE,
    HR_PERMS.APPROVE_LEAVE,
    HR_PERMS.APPROVE_EXPENSE,
    HR_PERMS.RUN_PAYROLL,
    HR_PERMS.MANAGE_RECRUITMENT,
    HR_PERMS.MANAGE_PERFORMANCE,
    HR_PERMS.MANAGE_ONBOARDING,
    HR_PERMS.POST_ANNOUNCEMENT,
    HR_PERMS.MANAGE_DOCUMENTS,
    HR_PERMS.MANAGE_SHIFTS,
    AUDIT_PERMS.READ,
  ],
  hr_executive: [
    HR_PERMS.READ,
    HR_PERMS.ATTENDANCE_WRITE,
    HR_PERMS.APPROVE_LEAVE,
    HR_PERMS.APPROVE_EXPENSE,
    HR_PERMS.MANAGE_RECRUITMENT,
  ],
} as const;

export type RoleSlug = keyof typeof ROLE_PERMISSIONS;
