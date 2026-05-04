import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  date,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { employees, designations } from './hr';

// ─── Enums ──────────────────────────────────────────────

export const reviewCycleStatusEnum = pgEnum('review_cycle_status', [
  'draft',
  'open',
  'review',
  'closed',
]);

export const goalStatusEnum = pgEnum('performance_goal_status', [
  'draft',
  'active',
  'completed',
]);

export const reviewRoleEnum = pgEnum('performance_review_role', [
  'self',
  'manager',
  'peer',
]);

// ─── KRA item schema (used inside jsonb columns) ───────

export interface KraItem {
  title: string;
  weight: number;
  target: string;
}

// ─── Tables ─────────────────────────────────────────────

export const reviewCycles = pgTable(
  'review_cycles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: reviewCycleStatusEnum('status').default('draft').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdx: index('review_cycles_tenant_id_idx').on(table.tenantId),
    statusIdx: index('review_cycles_status_idx').on(
      table.tenantId,
      table.status,
    ),
  }),
);

export const reviewCyclesRelations = relations(reviewCycles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [reviewCycles.tenantId],
    references: [tenants.id],
  }),
  goals: many(goals),
  reviews: many(reviewResponses),
  competencies: many(competencyRatings),
}));

export const kraTemplates = pgTable(
  'kra_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    designationId: uuid('designation_id').references(() => designations.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    kras: jsonb('kras').$type<KraItem[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdx: index('kra_templates_tenant_id_idx').on(table.tenantId),
    designationIdx: index('kra_templates_designation_idx').on(
      table.tenantId,
      table.designationId,
    ),
  }),
);

export const kraTemplatesRelations = relations(kraTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [kraTemplates.tenantId],
    references: [tenants.id],
  }),
  designation: one(designations, {
    fields: [kraTemplates.designationId],
    references: [designations.id],
  }),
}));

export const goals = pgTable(
  'performance_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    cycleId: uuid('cycle_id')
      .references(() => reviewCycles.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    weight: decimal('weight', { precision: 5, scale: 2 }).default('0').notNull(),
    target: text('target'),
    achievement: text('achievement'),
    status: goalStatusEnum('status').default('draft').notNull(),
    selfRating: integer('self_rating'),
    managerRating: integer('manager_rating'),
    managerComment: text('manager_comment'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdx: index('performance_goals_tenant_id_idx').on(table.tenantId),
    employeeIdx: index('performance_goals_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
    cycleIdx: index('performance_goals_cycle_idx').on(
      table.tenantId,
      table.cycleId,
    ),
  }),
);

export const goalsRelations = relations(goals, ({ one }) => ({
  tenant: one(tenants, {
    fields: [goals.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [goals.employeeId],
    references: [employees.id],
  }),
  cycle: one(reviewCycles, {
    fields: [goals.cycleId],
    references: [reviewCycles.id],
  }),
}));

export const reviewResponses = pgTable(
  'review_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    cycleId: uuid('cycle_id')
      .references(() => reviewCycles.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    reviewerId: uuid('reviewer_id')
      .references(() => employees.id, { onDelete: 'set null' }),
    role: reviewRoleEnum('role').notNull(),
    responses: jsonb('responses').default({}).notNull(),
    overallRating: decimal('overall_rating', { precision: 4, scale: 2 }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdx: index('review_responses_tenant_id_idx').on(table.tenantId),
    cycleEmpIdx: index('review_responses_cycle_emp_idx').on(
      table.tenantId,
      table.cycleId,
      table.employeeId,
    ),
  }),
);

export const reviewResponsesRelations = relations(reviewResponses, ({ one }) => ({
  tenant: one(tenants, {
    fields: [reviewResponses.tenantId],
    references: [tenants.id],
  }),
  cycle: one(reviewCycles, {
    fields: [reviewResponses.cycleId],
    references: [reviewCycles.id],
  }),
  employee: one(employees, {
    fields: [reviewResponses.employeeId],
    references: [employees.id],
  }),
  reviewer: one(employees, {
    fields: [reviewResponses.reviewerId],
    references: [employees.id],
  }),
}));

export const competencyRatings = pgTable(
  'competency_ratings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    cycleId: uuid('cycle_id')
      .references(() => reviewCycles.id, { onDelete: 'cascade' })
      .notNull(),
    competency: varchar('competency', { length: 255 }).notNull(),
    selfRating: integer('self_rating'),
    managerRating: integer('manager_rating'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tenantIdx: index('competency_ratings_tenant_id_idx').on(table.tenantId),
    cycleEmpIdx: index('competency_ratings_cycle_emp_idx').on(
      table.tenantId,
      table.cycleId,
      table.employeeId,
    ),
  }),
);

export const competencyRatingsRelations = relations(
  competencyRatings,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [competencyRatings.tenantId],
      references: [tenants.id],
    }),
    employee: one(employees, {
      fields: [competencyRatings.employeeId],
      references: [employees.id],
    }),
    cycle: one(reviewCycles, {
      fields: [competencyRatings.cycleId],
      references: [reviewCycles.id],
    }),
  }),
);
