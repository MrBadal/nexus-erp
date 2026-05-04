import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { employees, designations } from './hr';

// ─── Enums ──────────────────────────────────────────────

export const onboardingDefaultAssigneeEnum = pgEnum('onboarding_default_assignee', [
  'hr',
  'manager',
  'employee',
  'it',
  'admin',
]);

export const onboardingChecklistStatusEnum = pgEnum('onboarding_checklist_status', [
  'pending',
  'in_progress',
  'completed',
  'overdue',
]);

export const onboardingTaskStatusEnum = pgEnum('onboarding_task_status', [
  'pending',
  'done',
  'skipped',
]);

export const offboardingDefaultAssigneeEnum = pgEnum('offboarding_default_assignee', [
  'hr',
  'manager',
  'employee',
  'it',
  'admin',
]);

export const offboardingChecklistStatusEnum = pgEnum('offboarding_checklist_status', [
  'pending',
  'in_progress',
  'completed',
  'overdue',
]);

export const offboardingTaskStatusEnum = pgEnum('offboarding_task_status', [
  'pending',
  'done',
  'skipped',
]);

// ─── Onboarding Templates ───────────────────────────────

export const onboardingTemplates = pgTable(
  'onboarding_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    designationId: uuid('designation_id').references(() => designations.id, {
      onDelete: 'set null',
    }),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('onboarding_templates_tenant_id_idx').on(table.tenantId)],
);

export const onboardingTemplatesRelations = relations(
  onboardingTemplates,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [onboardingTemplates.tenantId],
      references: [tenants.id],
    }),
    designation: one(designations, {
      fields: [onboardingTemplates.designationId],
      references: [designations.id],
    }),
    tasks: many(onboardingTemplateTasks),
  }),
);

export const onboardingTemplateTasks = pgTable('onboarding_template_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id')
    .references(() => onboardingTemplates.id, { onDelete: 'cascade' })
    .notNull(),
  sequence: integer('sequence').default(0).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  defaultAssignee: onboardingDefaultAssigneeEnum('default_assignee').default('hr').notNull(),
  dueDays: integer('due_days').default(0).notNull(),
  isMandatory: boolean('is_mandatory').default(true).notNull(),
});

export const onboardingTemplateTasksRelations = relations(
  onboardingTemplateTasks,
  ({ one }) => ({
    template: one(onboardingTemplates, {
      fields: [onboardingTemplateTasks.templateId],
      references: [onboardingTemplates.id],
    }),
  }),
);

// ─── Onboarding Checklists & Tasks ──────────────────────

export const onboardingChecklists = pgTable(
  'onboarding_checklists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    templateId: uuid('template_id').references(() => onboardingTemplates.id, {
      onDelete: 'set null',
    }),
    status: onboardingChecklistStatusEnum('status').default('pending').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('onboarding_checklists_tenant_status_idx').on(table.tenantId, table.status),
    index('onboarding_checklists_employee_idx').on(table.employeeId),
  ],
);

export const onboardingChecklistsRelations = relations(
  onboardingChecklists,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [onboardingChecklists.tenantId],
      references: [tenants.id],
    }),
    employee: one(employees, {
      fields: [onboardingChecklists.employeeId],
      references: [employees.id],
    }),
    template: one(onboardingTemplates, {
      fields: [onboardingChecklists.templateId],
      references: [onboardingTemplates.id],
    }),
    tasks: many(onboardingTasks),
  }),
);

export const onboardingTasks = pgTable(
  'onboarding_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    checklistId: uuid('checklist_id')
      .references(() => onboardingChecklists.id, { onDelete: 'cascade' })
      .notNull(),
    sequence: integer('sequence').default(0).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    dueDate: date('due_date'),
    status: onboardingTaskStatusEnum('status').default('pending').notNull(),
    completedBy: uuid('completed_by').references(() => users.id, { onDelete: 'set null' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('onboarding_tasks_checklist_idx').on(table.checklistId)],
);

export const onboardingTasksRelations = relations(onboardingTasks, ({ one }) => ({
  checklist: one(onboardingChecklists, {
    fields: [onboardingTasks.checklistId],
    references: [onboardingChecklists.id],
  }),
  assignee: one(users, {
    fields: [onboardingTasks.assignedTo],
    references: [users.id],
  }),
}));

// ─── Offboarding Templates ──────────────────────────────

export const offboardingTemplates = pgTable(
  'offboarding_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    designationId: uuid('designation_id').references(() => designations.id, {
      onDelete: 'set null',
    }),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('offboarding_templates_tenant_id_idx').on(table.tenantId)],
);

export const offboardingTemplatesRelations = relations(
  offboardingTemplates,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [offboardingTemplates.tenantId],
      references: [tenants.id],
    }),
    designation: one(designations, {
      fields: [offboardingTemplates.designationId],
      references: [designations.id],
    }),
    tasks: many(offboardingTemplateTasks),
  }),
);

export const offboardingTemplateTasks = pgTable('offboarding_template_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id')
    .references(() => offboardingTemplates.id, { onDelete: 'cascade' })
    .notNull(),
  sequence: integer('sequence').default(0).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  defaultAssignee: offboardingDefaultAssigneeEnum('default_assignee').default('hr').notNull(),
  dueDays: integer('due_days').default(0).notNull(),
  isMandatory: boolean('is_mandatory').default(true).notNull(),
});

export const offboardingTemplateTasksRelations = relations(
  offboardingTemplateTasks,
  ({ one }) => ({
    template: one(offboardingTemplates, {
      fields: [offboardingTemplateTasks.templateId],
      references: [offboardingTemplates.id],
    }),
  }),
);

// ─── Offboarding Checklists & Tasks ─────────────────────

export const offboardingChecklists = pgTable(
  'offboarding_checklists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    templateId: uuid('template_id').references(() => offboardingTemplates.id, {
      onDelete: 'set null',
    }),
    status: offboardingChecklistStatusEnum('status').default('pending').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('offboarding_checklists_tenant_status_idx').on(table.tenantId, table.status),
    index('offboarding_checklists_employee_idx').on(table.employeeId),
  ],
);

export const offboardingChecklistsRelations = relations(
  offboardingChecklists,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [offboardingChecklists.tenantId],
      references: [tenants.id],
    }),
    employee: one(employees, {
      fields: [offboardingChecklists.employeeId],
      references: [employees.id],
    }),
    template: one(offboardingTemplates, {
      fields: [offboardingChecklists.templateId],
      references: [offboardingTemplates.id],
    }),
    tasks: many(offboardingTasks),
  }),
);

export const offboardingTasks = pgTable(
  'offboarding_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    checklistId: uuid('checklist_id')
      .references(() => offboardingChecklists.id, { onDelete: 'cascade' })
      .notNull(),
    sequence: integer('sequence').default(0).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    dueDate: date('due_date'),
    status: offboardingTaskStatusEnum('status').default('pending').notNull(),
    completedBy: uuid('completed_by').references(() => users.id, { onDelete: 'set null' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('offboarding_tasks_checklist_idx').on(table.checklistId)],
);

export const offboardingTasksRelations = relations(offboardingTasks, ({ one }) => ({
  checklist: one(offboardingChecklists, {
    fields: [offboardingTasks.checklistId],
    references: [offboardingChecklists.id],
  }),
  assignee: one(users, {
    fields: [offboardingTasks.assignedTo],
    references: [users.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type OnboardingTemplate = typeof onboardingTemplates.$inferSelect;
export type NewOnboardingTemplate = typeof onboardingTemplates.$inferInsert;
export type OnboardingTemplateTask = typeof onboardingTemplateTasks.$inferSelect;
export type NewOnboardingTemplateTask = typeof onboardingTemplateTasks.$inferInsert;
export type OnboardingChecklist = typeof onboardingChecklists.$inferSelect;
export type NewOnboardingChecklist = typeof onboardingChecklists.$inferInsert;
export type OnboardingTask = typeof onboardingTasks.$inferSelect;
export type NewOnboardingTask = typeof onboardingTasks.$inferInsert;

export type OffboardingTemplate = typeof offboardingTemplates.$inferSelect;
export type NewOffboardingTemplate = typeof offboardingTemplates.$inferInsert;
export type OffboardingTemplateTask = typeof offboardingTemplateTasks.$inferSelect;
export type NewOffboardingTemplateTask = typeof offboardingTemplateTasks.$inferInsert;
export type OffboardingChecklist = typeof offboardingChecklists.$inferSelect;
export type NewOffboardingChecklist = typeof offboardingChecklists.$inferInsert;
export type OffboardingTask = typeof offboardingTasks.$inferSelect;
export type NewOffboardingTask = typeof offboardingTasks.$inferInsert;
