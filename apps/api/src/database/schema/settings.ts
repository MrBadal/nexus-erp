import { pgTable, pgEnum, uuid, varchar, text, integer, decimal, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

// ─── Business Settings ────────────────────────────────────────────────────────

export const businessSettings = pgTable('business_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  // Company details
  companyName: varchar('company_name', { length: 255 }),
  addressLine1: varchar('address_line1', { length: 255 }),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }).default('India'),
  phone: varchar('phone', { length: 30 }),
  website: varchar('website', { length: 255 }),
  // Tax identifiers
  taxId: varchar('tax_id', { length: 50 }),
  gstNumber: varchar('gst_number', { length: 20 }),
  panNumber: varchar('pan_number', { length: 15 }),
  // Business info
  industry: varchar('industry', { length: 100 }),
  logoUrl: text('logo_url'),
  // Defaults
  defaultCurrency: varchar('default_currency', { length: 3 }).default('INR').notNull(),
  fiscalYearStartMonth: integer('fiscal_year_start_month').default(4).notNull(), // April for India
  timezone: varchar('timezone', { length: 50 }).default('Asia/Kolkata').notNull(),
  dateFormat: varchar('date_format', { length: 20 }).default('DD/MM/YYYY').notNull(),
  // Setup tracking
  setupComplete: boolean('setup_complete').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const businessSettingsRelations = relations(businessSettings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [businessSettings.tenantId],
    references: [tenants.id],
  }),
}));

export type BusinessSettings = typeof businessSettings.$inferSelect;
export type NewBusinessSettings = typeof businessSettings.$inferInsert;

// ─── Number Series ────────────────────────────────────────────────────────────

export const numberSeries = pgTable('number_series', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(), // invoice, bill, payment, sales_order, purchase_order, etc.
  prefix: varchar('prefix', { length: 20 }).notNull(),
  suffix: varchar('suffix', { length: 20 }),
  currentNumber: integer('current_number').default(0).notNull(),
  padLength: integer('pad_length').default(6).notNull(),
  fiscalYear: varchar('fiscal_year', { length: 10 }), // e.g., '2026-27'
  resetAnnually: boolean('reset_annually').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const numberSeriesRelations = relations(numberSeries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [numberSeries.tenantId],
    references: [tenants.id],
  }),
}));

export type NumberSeries = typeof numberSeries.$inferSelect;
export type NewNumberSeries = typeof numberSeries.$inferInsert;

// ─── Approval Workflows ──────────────────────────────────────────────────────

export const approvalActionEnum = pgEnum('approval_action', [
  'approved',
  'rejected',
  'returned',
]);

export const approvalRequestStatusEnum = pgEnum('approval_request_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const approvalWorkflows = pgTable('approval_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  description: text('description'),
  thresholdAmount: decimal('threshold_amount', { precision: 20, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [approvalWorkflows.tenantId],
    references: [tenants.id],
  }),
  steps: many(approvalWorkflowSteps),
}));

export const approvalWorkflowSteps = pgTable('approval_workflow_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id')
    .references(() => approvalWorkflows.id, { onDelete: 'cascade' })
    .notNull(),
  stepOrder: integer('step_order').notNull(),
  approverRoleId: uuid('approver_role_id'),
  approverUserId: uuid('approver_user_id'),
  description: varchar('description', { length: 255 }),
});

export const approvalWorkflowStepsRelations = relations(approvalWorkflowSteps, ({ one }) => ({
  workflow: one(approvalWorkflows, {
    fields: [approvalWorkflowSteps.workflowId],
    references: [approvalWorkflows.id],
  }),
}));

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  workflowId: uuid('workflow_id')
    .references(() => approvalWorkflows.id, { onDelete: 'cascade' })
    .notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  documentId: uuid('document_id').notNull(),
  documentNumber: varchar('document_number', { length: 100 }),
  currentStep: integer('current_step').default(1).notNull(),
  status: approvalRequestStatusEnum('status').default('pending').notNull(),
  requestedBy: uuid('requested_by').notNull(),
  amount: decimal('amount', { precision: 20, scale: 4 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const approvalRequestsRelations = relations(approvalRequests, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [approvalRequests.tenantId],
    references: [tenants.id],
  }),
  workflow: one(approvalWorkflows, {
    fields: [approvalRequests.workflowId],
    references: [approvalWorkflows.id],
  }),
  actions: many(approvalRequestActions),
}));

export const approvalRequestActions = pgTable('approval_request_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  requestId: uuid('request_id')
    .references(() => approvalRequests.id, { onDelete: 'cascade' })
    .notNull(),
  stepOrder: integer('step_order').notNull(),
  action: approvalActionEnum('action').notNull(),
  actionBy: uuid('action_by').notNull(),
  comments: text('comments'),
  actionAt: timestamp('action_at', { withTimezone: true }).defaultNow().notNull(),
});

export const approvalRequestActionsRelations = relations(approvalRequestActions, ({ one }) => ({
  request: one(approvalRequests, {
    fields: [approvalRequestActions.requestId],
    references: [approvalRequests.id],
  }),
}));

export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type NewApprovalWorkflow = typeof approvalWorkflows.$inferInsert;
export type ApprovalWorkflowStep = typeof approvalWorkflowSteps.$inferSelect;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type ApprovalRequestAction = typeof approvalRequestActions.$inferSelect;

// ─── Retention Policies ──────────────────────────────────

export const retentionPolicies = pgTable('retention_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  retentionDays: integer('retention_days').notNull(),
  autoArchive: boolean('auto_archive').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type RetentionPolicy = typeof retentionPolicies.$inferSelect;
export type NewRetentionPolicy = typeof retentionPolicies.$inferInsert;

// ─── Legal Holds ────────────────────────────────────────

export const legalHolds = pgTable('legal_holds', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  documentId: uuid('document_id').notNull(),
  reason: text('reason').notNull(),
  heldBy: uuid('held_by').references(() => users.id, { onDelete: 'set null' }),
  heldAt: timestamp('held_at', { withTimezone: true }).defaultNow().notNull(),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  releasedBy: uuid('released_by').references(() => users.id, { onDelete: 'set null' }),
});

export type LegalHold = typeof legalHolds.$inferSelect;
export type NewLegalHold = typeof legalHolds.$inferInsert;

// ─── Security Events ────────────────────────────────────

export const securityEventTypeEnum = pgEnum('security_event_type', [
  'login_success', 'login_failed', 'password_change', 'mfa_enabled', 'mfa_disabled',
  'role_change', 'permission_change', 'account_locked', 'account_unlocked',
]);

export const securityEvents = pgTable('security_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: securityEventTypeEnum('event_type').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type NewSecurityEvent = typeof securityEvents.$inferInsert;

// ─── SMTP Settings (per-tenant outbound email) ──────────────────────────
//
// Tenants configure their own SMTP credentials so password-reset, invite,
// payslip-ready, leave-decision, expense-decision, announcement, etc. mails
// flow from their own corporate domain instead of a shared NexusERP relay.
// `passwordEncrypted` is AES-256-GCM ciphertext (iv:tag:ct) using
// SMTP_ENCRYPTION_KEY (or JWT_SECRET-derived key as fallback). Never expose
// the raw or encrypted password back to the API consumer — controller
// returns a `passwordSet: boolean` flag instead.

export const smtpSettings = pgTable('smtp_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  host: varchar('host', { length: 255 }).notNull(),
  port: integer('port').notNull().default(587),
  secure: boolean('secure').default(false).notNull(), // true = TLS on connect (465); false = STARTTLS (587/25)
  username: varchar('username', { length: 255 }).notNull(),
  passwordEncrypted: text('password_encrypted').notNull(),
  fromEmail: varchar('from_email', { length: 255 }).notNull(),
  fromName: varchar('from_name', { length: 255 }),
  replyTo: varchar('reply_to', { length: 255 }),
  enabled: boolean('enabled').default(true).notNull(),
  lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
  lastTestStatus: varchar('last_test_status', { length: 20 }), // 'success' | 'failure'
  lastTestError: text('last_test_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const smtpSettingsRelations = relations(smtpSettings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [smtpSettings.tenantId],
    references: [tenants.id],
  }),
}));

export type SmtpSettings = typeof smtpSettings.$inferSelect;
export type NewSmtpSettings = typeof smtpSettings.$inferInsert;

// ─── Email Log (audit trail of every send attempt) ──────────────────────

export const emailLogs = pgTable('email_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  toAddress: varchar('to_address', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  template: varchar('template', { length: 100 }), // 'invite' | 'password_reset' | 'leave_decision' | ...
  status: varchar('status', { length: 20 }).notNull(), // 'sent' | 'failed'
  errorMessage: text('error_message'),
  messageId: varchar('message_id', { length: 255 }),
  metadata: jsonb('metadata'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
