import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { employees } from './hr';

// ─── Tables ─────────────────────────────────────────────

export const exitClearances = pgTable(
  'exit_clearances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    resignationDate: date('resignation_date'),
    lastWorkingDate: date('last_working_date'),
    reason: text('reason'),
    // 'in_progress' | 'cleared' | 'settled' | 'cancelled'
    status: varchar('status', { length: 20 }).default('in_progress').notNull(),
    itCleared: boolean('it_cleared').default(false).notNull(),
    financeCleared: boolean('finance_cleared').default(false).notNull(),
    hrCleared: boolean('hr_cleared').default(false).notNull(),
    adminCleared: boolean('admin_cleared').default(false).notNull(),
    managerCleared: boolean('manager_cleared').default(false).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantEmployeeIdx: index('exit_clearances_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
    tenantStatusIdx: index('exit_clearances_tenant_status_idx').on(
      table.tenantId,
      table.status,
    ),
  }),
);

export const finalSettlements = pgTable(
  'final_settlements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    exitClearanceId: uuid('exit_clearance_id')
      .references(() => exitClearances.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    gratuityAmount: decimal('gratuity_amount', { precision: 20, scale: 2 })
      .default('0')
      .notNull(),
    leaveEncashment: decimal('leave_encashment', { precision: 20, scale: 2 })
      .default('0')
      .notNull(),
    pendingSalary: decimal('pending_salary', { precision: 20, scale: 2 })
      .default('0')
      .notNull(),
    bonusAmount: decimal('bonus_amount', { precision: 20, scale: 2 })
      .default('0')
      .notNull(),
    deductions: decimal('deductions', { precision: 20, scale: 2 })
      .default('0')
      .notNull(),
    netPayable: decimal('net_payable', { precision: 20, scale: 2 })
      .default('0')
      .notNull(),
    settledDate: date('settled_date'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantEmployeeIdx: index('final_settlements_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
  }),
);

// ─── Relations ──────────────────────────────────────────

export const exitClearancesRelations = relations(exitClearances, ({ one }) => ({
  tenant: one(tenants, {
    fields: [exitClearances.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [exitClearances.employeeId],
    references: [employees.id],
  }),
  finalSettlement: one(finalSettlements, {
    fields: [exitClearances.id],
    references: [finalSettlements.exitClearanceId],
  }),
}));

export const finalSettlementsRelations = relations(finalSettlements, ({ one }) => ({
  tenant: one(tenants, {
    fields: [finalSettlements.tenantId],
    references: [tenants.id],
  }),
  exitClearance: one(exitClearances, {
    fields: [finalSettlements.exitClearanceId],
    references: [exitClearances.id],
  }),
  employee: one(employees, {
    fields: [finalSettlements.employeeId],
    references: [employees.id],
  }),
}));

// ─── Types ──────────────────────────────────────────────

export type ExitClearance = typeof exitClearances.$inferSelect;
export type NewExitClearance = typeof exitClearances.$inferInsert;
export type FinalSettlement = typeof finalSettlements.$inferSelect;
export type NewFinalSettlement = typeof finalSettlements.$inferInsert;
