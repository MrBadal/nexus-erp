import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  decimal,
  timestamp,
  date,
  time,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants.js';
import { employees } from './hr.js';

// ─── Shifts ─────────────────────────────────────────────

export const shifts = pgTable(
  'shifts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 20 }).notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    breakMinutes: integer('break_minutes').default(0).notNull(),
    weekendDays: integer('weekend_days').array().default([0, 6]).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('shifts_tenant_code_unique_idx').on(table.tenantId, table.code),
    index('shifts_tenant_id_idx').on(table.tenantId),
  ],
);

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [shifts.tenantId],
    references: [tenants.id],
  }),
  assignments: many(shiftAssignments),
}));

// ─── Shift Assignments ──────────────────────────────────

export const shiftAssignments = pgTable(
  'shift_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    shiftId: uuid('shift_id')
      .references(() => shifts.id, { onDelete: 'cascade' })
      .notNull(),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('shift_assignments_tenant_employee_idx').on(table.tenantId, table.employeeId),
    index('shift_assignments_shift_idx').on(table.shiftId),
  ],
);

export const shiftAssignmentsRelations = relations(shiftAssignments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [shiftAssignments.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [shiftAssignments.employeeId],
    references: [employees.id],
  }),
  shift: one(shifts, {
    fields: [shiftAssignments.shiftId],
    references: [shifts.id],
  }),
}));

// ─── Attendance Policies ────────────────────────────────

export const attendancePolicies = pgTable(
  'attendance_policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    graceMinutes: integer('grace_minutes').default(15).notNull(),
    lateThresholdMinutes: integer('late_threshold_minutes').default(30).notNull(),
    deductionPerInstance: decimal('deduction_per_instance', { precision: 20, scale: 4 })
      .default('0')
      .notNull(),
    monthlyToleranceCount: integer('monthly_tolerance_count').default(3).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('attendance_policies_tenant_id_idx').on(table.tenantId)],
);

export const attendancePoliciesRelations = relations(attendancePolicies, ({ one }) => ({
  tenant: one(tenants, {
    fields: [attendancePolicies.tenantId],
    references: [tenants.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type Shift = typeof shifts.$inferSelect;
export type NewShift = typeof shifts.$inferInsert;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;
export type NewShiftAssignment = typeof shiftAssignments.$inferInsert;
export type AttendancePolicy = typeof attendancePolicies.$inferSelect;
export type NewAttendancePolicy = typeof attendancePolicies.$inferInsert;
