import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  boolean,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

// ─── Enums ──────────────────────────────────────────────

export const projectStatusEnum = pgEnum('project_status', [
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled',
]);

export const projectPriorityEnum = pgEnum('project_priority', [
  'low',
  'medium',
  'high',
  'critical',
]);

export const projectTaskStatusEnum = pgEnum('project_task_status', [
  'open',
  'working',
  'pending_review',
  'completed',
  'cancelled',
  'overdue',
]);

export const timesheetStatusEnum = pgEnum('timesheet_status', [
  'draft',
  'submitted',
  'approved',
  'rejected',
]);

export const projectUpdateStatusEnum = pgEnum('project_update_status', [
  'info',
  'warning',
  'critical',
]);

// ─── Tables ─────────────────────────────────────────────

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  projectNumber: varchar('project_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: projectStatusEnum('status').default('planning').notNull(),
  priority: projectPriorityEnum('priority').default('medium').notNull(),
  projectType: varchar('project_type', { length: 100 }),
  department: varchar('department', { length: 100 }),
  company: varchar('company', { length: 255 }),
  estimatedCost: decimal('estimated_cost', { precision: 20, scale: 4 }).default('0').notNull(),
  actualCost: decimal('actual_cost', { precision: 20, scale: 4 }).default('0').notNull(),
  percentComplete: integer('percent_complete').default(0).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  actualStartDate: date('actual_start_date'),
  actualEndDate: date('actual_end_date'),
  projectManager: uuid('project_manager').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const projectTasks = pgTable('project_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  taskNumber: varchar('task_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: projectTaskStatusEnum('status').default('open').notNull(),
  priority: projectPriorityEnum('priority').default('medium').notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  actualStartDate: date('actual_start_date'),
  actualEndDate: date('actual_end_date'),
  estimatedHours: decimal('estimated_hours', { precision: 10, scale: 2 }).default('0').notNull(),
  actualHours: decimal('actual_hours', { precision: 10, scale: 2 }).default('0').notNull(),
  percentComplete: integer('percent_complete').default(0).notNull(),
  parentTaskId: uuid('parent_task_id'),
  dependsOn: uuid('depends_on'),
  isMilestone: boolean('is_milestone').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const timesheets = pgTable('timesheets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  employeeId: uuid('employee_id').references(() => users.id, { onDelete: 'set null' }),
  employeeName: varchar('employee_name', { length: 255 }).notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  taskId: uuid('task_id').references(() => projectTasks.id, { onDelete: 'set null' }),
  activityType: varchar('activity_type', { length: 100 }).notNull(),
  hours: decimal('hours', { precision: 10, scale: 2 }).notNull(),
  billingHours: decimal('billing_hours', { precision: 10, scale: 2 }).default('0').notNull(),
  billingRate: decimal('billing_rate', { precision: 20, scale: 4 }).default('0').notNull(),
  billingAmount: decimal('billing_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  date: date('date').notNull(),
  description: text('description'),
  status: timesheetStatusEnum('status').default('draft').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const projectUpdates = pgTable('project_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  postedBy: uuid('posted_by').references(() => users.id, { onDelete: 'set null' }),
  status: projectUpdateStatusEnum('status').default('info').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── Relations ──────────────────────────────────────────

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [projects.tenantId],
    references: [tenants.id],
  }),
  manager: one(users, {
    fields: [projects.projectManager],
    references: [users.id],
  }),
  tasks: many(projectTasks),
  timesheets: many(timesheets),
  updates: many(projectUpdates),
}));

export const projectTasksRelations = relations(projectTasks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [projectTasks.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [projectTasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [projectTasks.assignedTo],
    references: [users.id],
  }),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [timesheets.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [timesheets.projectId],
    references: [projects.id],
  }),
  task: one(projectTasks, {
    fields: [timesheets.taskId],
    references: [projectTasks.id],
  }),
  employee: one(users, {
    fields: [timesheets.employeeId],
    references: [users.id],
  }),
}));

export const projectUpdatesRelations = relations(projectUpdates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [projectUpdates.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [projectUpdates.projectId],
    references: [projects.id],
  }),
  poster: one(users, {
    fields: [projectUpdates.postedBy],
    references: [users.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type NewProjectTask = typeof projectTasks.$inferInsert;
export type Timesheet = typeof timesheets.$inferSelect;
export type NewTimesheet = typeof timesheets.$inferInsert;
export type ProjectUpdate = typeof projectUpdates.$inferSelect;
export type NewProjectUpdate = typeof projectUpdates.$inferInsert;
