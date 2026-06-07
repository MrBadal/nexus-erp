import {
  pgTable,
  uuid,
  text,
  decimal,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { employees } from './hr';

// ─── Tables ─────────────────────────────────────────────

export const salaryRevisions = pgTable(
  'salary_revisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    effectiveDate: date('effective_date').notNull(),
    previousCtc: decimal('previous_ctc', { precision: 20, scale: 2 }),
    newCtc: decimal('new_ctc', { precision: 20, scale: 2 }).notNull(),
    revisionPercent: decimal('revision_percent', { precision: 6, scale: 2 }),
    reason: text('reason'),
    approvedBy: uuid('approved_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantEmployeeIdx: index('salary_revisions_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
  }),
);

export const salaryRevisionsRelations = relations(salaryRevisions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [salaryRevisions.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [salaryRevisions.employeeId],
    references: [employees.id],
  }),
}));

export type SalaryRevision = typeof salaryRevisions.$inferSelect;
export type NewSalaryRevision = typeof salaryRevisions.$inferInsert;
