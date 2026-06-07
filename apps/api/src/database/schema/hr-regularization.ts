import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { employees } from './hr';

// ─── Tables ─────────────────────────────────────────────

export const attendanceRegularizations = pgTable(
  'attendance_regularizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    date: date('date').notNull(),
    requestedCheckIn: timestamp('requested_check_in', { withTimezone: true }),
    requestedCheckOut: timestamp('requested_check_out', { withTimezone: true }),
    // One of: present / absent / half_day / late / on_leave
    requestedStatus: varchar('requested_status', { length: 20 }).notNull(),
    reason: text('reason').notNull(),
    // pending / approved / rejected
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantEmployeeIdx: index('attendance_regularizations_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
    tenantStatusIdx: index('attendance_regularizations_tenant_status_idx').on(
      table.tenantId,
      table.status,
    ),
  }),
);

export const attendanceRegularizationsRelations = relations(
  attendanceRegularizations,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [attendanceRegularizations.tenantId],
      references: [tenants.id],
    }),
    employee: one(employees, {
      fields: [attendanceRegularizations.employeeId],
      references: [employees.id],
    }),
  }),
);

export type AttendanceRegularization = typeof attendanceRegularizations.$inferSelect;
export type NewAttendanceRegularization = typeof attendanceRegularizations.$inferInsert;
