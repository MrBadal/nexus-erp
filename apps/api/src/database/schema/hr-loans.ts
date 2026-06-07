import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { employees } from './hr';

// ─── Tables ─────────────────────────────────────────────

export const employeeLoans = pgTable(
  'employee_loans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    loanNumber: varchar('loan_number', { length: 50 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(), // 'loan' | 'advance'
    principalAmount: decimal('principal_amount', { precision: 20, scale: 2 }).notNull(),
    interestRate: decimal('interest_rate', { precision: 6, scale: 2 }).default('0').notNull(),
    installments: integer('installments').notNull().default(1),
    installmentsPaid: integer('installments_paid').default(0).notNull(),
    emiAmount: decimal('emi_amount', { precision: 20, scale: 2 }).notNull(),
    outstandingAmount: decimal('outstanding_amount', { precision: 20, scale: 2 }).notNull(),
    reason: text('reason'),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending/approved/rejected/closed/cancelled
    disbursedDate: date('disbursed_date'),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantEmployeeIdx: index('employee_loans_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
    tenantStatusIdx: index('employee_loans_tenant_status_idx').on(
      table.tenantId,
      table.status,
    ),
  }),
);

export const loanRepayments = pgTable('loan_repayments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  loanId: uuid('loan_id')
    .references(() => employeeLoans.id, { onDelete: 'cascade' })
    .notNull(),
  amount: decimal('amount', { precision: 20, scale: 2 }).notNull(),
  paidDate: date('paid_date').notNull(),
  payrollEntryId: uuid('payroll_entry_id'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Relations ──────────────────────────────────────────

export const employeeLoansRelations = relations(employeeLoans, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [employeeLoans.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [employeeLoans.employeeId],
    references: [employees.id],
  }),
  repayments: many(loanRepayments),
}));

export const loanRepaymentsRelations = relations(loanRepayments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [loanRepayments.tenantId],
    references: [tenants.id],
  }),
  loan: one(employeeLoans, {
    fields: [loanRepayments.loanId],
    references: [employeeLoans.id],
  }),
}));

// ─── Types ──────────────────────────────────────────────

export type EmployeeLoan = typeof employeeLoans.$inferSelect;
export type NewEmployeeLoan = typeof employeeLoans.$inferInsert;
export type LoanRepayment = typeof loanRepayments.$inferSelect;
export type NewLoanRepayment = typeof loanRepayments.$inferInsert;
