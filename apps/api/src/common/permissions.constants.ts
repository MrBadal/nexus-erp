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
  /** Tenant-wide holiday calendar — every role gets this, not just `employee`
   *  (unlike ESS_PERMS.READ, which is specific to the self-service portal). */
  READ_HOLIDAYS: 'ess:read_holidays',
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

// ─── CRM / Sales ────────────────────────────────────────────────
export const CRM_PERMS = {
  READ: 'crm:read',
  WRITE: 'crm:write',
  DELETE: 'crm:delete',
  /** See every lead in the tenant (managers), not just own + unassigned. */
  READ_ALL: 'crm:read_all',
  /** Assign/reassign leads to other users (managers). */
  ASSIGN: 'crm:assign',
  ACTIVITIES_READ: 'activities:read',
  ACTIVITIES_WRITE: 'activities:write',
} as const;

// ─── Audit ──────────────────────────────────────────────────────
export const AUDIT_PERMS = {
  READ: 'audit:read',
} as const;

// ─── Notifications (broadly accessible — every role manages its own) ────
export const NOTIFICATION_PERMS = {
  READ: 'notifications:read',
  WRITE: 'notifications:write',
} as const;

// ─── Finance ────────────────────────────────────────────────────
export const FINANCE_PERMS = {
  READ: 'finance:read',
  WRITE: 'finance:write',
} as const;

// ─── Reports ────────────────────────────────────────────────────
export const REPORTS_PERMS = {
  READ: 'reports:read',
} as const;

// ─── Read-only permissions for modules not yet built out beyond a
//     single read grant — used by the `viewer` role's cross-module access ──
export const SELLING_PERMS = { READ: 'selling:read' } as const;
export const BUYING_PERMS = { READ: 'buying:read' } as const;
export const INVENTORY_PERMS = { READ: 'inventory:read' } as const;
export const MANUFACTURING_PERMS = { READ: 'manufacturing:read' } as const;
export const PROJECTS_PERMS = { READ: 'projects:read' } as const;
export const ASSETS_PERMS = { READ: 'assets:read' } as const;
export const QUALITY_PERMS = { READ: 'quality:read' } as const;
export const HELPDESK_PERMS = { READ: 'helpdesk:read' } as const;

// ─── Default permission sets per seeded role ────────────────────
export const ROLE_PERMISSIONS = {
  admin: ['*'],
  employee: [
    ESS_PERMS.READ,
    ESS_PERMS.WRITE,
    ESS_PERMS.APPLY_LEAVE,
    ESS_PERMS.SUBMIT_EXPENSE,
    ESS_PERMS.CHECK_IN,
    ESS_PERMS.READ_HOLIDAYS,
    NOTIFICATION_PERMS.READ,
    NOTIFICATION_PERMS.WRITE,
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
    ESS_PERMS.READ_HOLIDAYS,
    NOTIFICATION_PERMS.READ,
    NOTIFICATION_PERMS.WRITE,
  ],
  hr_executive: [
    HR_PERMS.READ,
    HR_PERMS.ATTENDANCE_WRITE,
    HR_PERMS.APPROVE_LEAVE,
    HR_PERMS.APPROVE_EXPENSE,
    HR_PERMS.MANAGE_RECRUITMENT,
    ESS_PERMS.READ_HOLIDAYS,
    NOTIFICATION_PERMS.READ,
    NOTIFICATION_PERMS.WRITE,
  ],
  // Inside-sales rep: works their own leads + the unassigned pool. Cannot see
  // other reps' leads or reassign.
  telecaller: [
    CRM_PERMS.READ,
    CRM_PERMS.WRITE,
    CRM_PERMS.ACTIVITIES_READ,
    CRM_PERMS.ACTIVITIES_WRITE,
    ESS_PERMS.READ_HOLIDAYS,
    NOTIFICATION_PERMS.READ,
    NOTIFICATION_PERMS.WRITE,
  ],
  // Sales manager: full visibility + can assign/reassign and delete.
  sales_manager: [
    CRM_PERMS.READ,
    CRM_PERMS.WRITE,
    CRM_PERMS.DELETE,
    CRM_PERMS.READ_ALL,
    CRM_PERMS.ASSIGN,
    CRM_PERMS.ACTIVITIES_READ,
    CRM_PERMS.ACTIVITIES_WRITE,
    ESS_PERMS.READ_HOLIDAYS,
    NOTIFICATION_PERMS.READ,
    NOTIFICATION_PERMS.WRITE,
  ],
  accountant: [
    FINANCE_PERMS.READ,
    FINANCE_PERMS.WRITE,
    REPORTS_PERMS.READ,
    ESS_PERMS.READ_HOLIDAYS,
    NOTIFICATION_PERMS.READ,
    NOTIFICATION_PERMS.WRITE,
  ],
  // Read-only across every module except HR — for auditors, execs, and similar
  // oversight roles. hr:read is deliberately excluded: a cross-module
  // read-only role should not reach payroll, Form-16, statutory PF/ESI
  // filings, or employee master data. Narrower HR-specific read access (e.g.
  // org-chart) is a separate, purpose-built permission if it's ever
  // genuinely needed -- not this one.
  viewer: [
    FINANCE_PERMS.READ,
    SELLING_PERMS.READ,
    BUYING_PERMS.READ,
    INVENTORY_PERMS.READ,
    CRM_PERMS.READ,
    MANUFACTURING_PERMS.READ,
    PROJECTS_PERMS.READ,
    ASSETS_PERMS.READ,
    QUALITY_PERMS.READ,
    HELPDESK_PERMS.READ,
    REPORTS_PERMS.READ,
    ESS_PERMS.READ_HOLIDAYS,
    NOTIFICATION_PERMS.READ,
    NOTIFICATION_PERMS.WRITE,
  ],
} as const;

export type RoleSlug = keyof typeof ROLE_PERMISSIONS;
