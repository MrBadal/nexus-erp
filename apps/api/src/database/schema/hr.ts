import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

// ─── Enums ──────────────────────────────────────────────

export const employmentTypeEnum = pgEnum('employment_type', [
  'full_time',
  'part_time',
  'contract',
  'intern',
]);

export const employeeStatusEnum = pgEnum('employee_status', [
  'active',
  'inactive',
  'terminated',
  'on_leave',
]);

export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

export const maritalStatusEnum = pgEnum('marital_status', [
  'single',
  'married',
  'divorced',
  'widowed',
]);

export const attendanceStatusEnum = pgEnum('attendance_status', [
  'present',
  'absent',
  'half_day',
  'late',
  'on_leave',
]);

export const leaveApplicationStatusEnum = pgEnum('leave_application_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const salaryComponentTypeEnum = pgEnum('salary_component_type', [
  'earning',
  'deduction',
]);

export const payrollStatusEnum = pgEnum('payroll_status', [
  'draft',
  'submitted',
  'approved',
  'paid',
]);

export const payrollPaymentMethodEnum = pgEnum('payroll_payment_method', [
  'bank_transfer',
  'check',
  'cash',
]);

export const taxRegimeEnum = pgEnum('tax_regime', ['old', 'new']);

export const taxDeclarationSectionEnum = pgEnum('tax_declaration_section', [
  '80C',
  '80D',
  '80E',
  '80G',
  '80TTA',
  '80CCD',
  '24B',
  'HRA',
  'LTA',
  'OTHER',
]);

// ─── Tables ─────────────────────────────────────────────

export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),
  parentId: uuid('parent_id'),
  managerId: uuid('manager_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [departments.tenantId],
    references: [tenants.id],
  }),
  parent: one(departments, {
    fields: [departments.parentId],
    references: [departments.id],
    relationName: 'departmentParentChild',
  }),
  children: many(departments, { relationName: 'departmentParentChild' }),
  employees: many(employees),
}));

export const designations = pgTable('designations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  level: integer('level').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const designationsRelations = relations(designations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [designations.tenantId],
    references: [tenants.id],
  }),
  employees: many(employees),
}));

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  dateOfBirth: date('date_of_birth'),
  gender: genderEnum('gender'),
  maritalStatus: maritalStatusEnum('marital_status'),
  nationalId: varchar('national_id', { length: 100 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  designationId: uuid('designation_id').references(() => designations.id, { onDelete: 'set null' }),
  managerId: uuid('manager_id'),
  employmentType: employmentTypeEnum('employment_type').default('full_time').notNull(),
  dateOfJoining: date('date_of_joining').notNull(),
  dateOfLeaving: date('date_of_leaving'),
  // Probation / confirmation lifecycle
  probationEndDate: date('probation_end_date'),
  confirmationDate: date('confirmation_date'),
  confirmationStatus: varchar('confirmation_status', { length: 20 })
    .default('probation')
    .notNull(), // 'probation' | 'confirmed'
  status: employeeStatusEnum('status').default('active').notNull(),
  emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
  bankName: varchar('bank_name', { length: 255 }),
  bankAccountNumber: varchar('bank_account_number', { length: 100 }),
  bankRoutingNumber: varchar('bank_routing_number', { length: 50 }),
  bankIfscCode: varchar('bank_ifsc_code', { length: 20 }),
  // Indian statutory identifiers
  panNumber: varchar('pan_number', { length: 10 }),
  uanNumber: varchar('uan_number', { length: 12 }),
  esicNumber: varchar('esic_number', { length: 17 }),
  aadhaarNumber: varchar('aadhaar_number', { length: 12 }),
  taxRegime: taxRegimeEnum('tax_regime').default('new'),
  pfState: varchar('pf_state', { length: 100 }), // for Professional Tax state rules
  profileImageUrl: text('profile_image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('employees_tenant_id_idx').on(table.tenantId),
  index('employees_tenant_id_status_idx').on(table.tenantId, table.status),
]);

export const employeesRelations = relations(employees, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [employees.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  designation: one(designations, {
    fields: [employees.designationId],
    references: [designations.id],
  }),
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
    relationName: 'employeeManager',
  }),
  directReports: many(employees, { relationName: 'employeeManager' }),
  attendanceRecords: many(attendanceRecords),
  leaveAllocations: many(leaveAllocations),
  leaveApplications: many(leaveApplications),
  payrollEntries: many(payrollEntries),
  taxDeclarations: many(taxDeclarations),
}));

export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  employeeId: uuid('employee_id')
    .references(() => employees.id, { onDelete: 'cascade' })
    .notNull(),
  date: date('date').notNull(),
  checkIn: timestamp('check_in', { withTimezone: true }),
  checkOut: timestamp('check_out', { withTimezone: true }),
  status: attendanceStatusEnum('status').default('present').notNull(),
  workingHours: decimal('working_hours', { precision: 5, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('attendance_records_tenant_id_date_idx').on(table.tenantId, table.date),
]);

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  tenant: one(tenants, {
    fields: [attendanceRecords.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [attendanceRecords.employeeId],
    references: [employees.id],
  }),
}));

export const leaveTypes = pgTable('leave_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  defaultDays: integer('default_days').default(0).notNull(),
  isPaid: boolean('is_paid').default(true).notNull(),
  isCarryForward: boolean('is_carry_forward').default(false).notNull(),
  maxCarryForwardDays: integer('max_carry_forward_days').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const leaveTypesRelations = relations(leaveTypes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [leaveTypes.tenantId],
    references: [tenants.id],
  }),
  allocations: many(leaveAllocations),
  applications: many(leaveApplications),
}));

export const leaveAllocations = pgTable('leave_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  employeeId: uuid('employee_id')
    .references(() => employees.id, { onDelete: 'cascade' })
    .notNull(),
  leaveTypeId: uuid('leave_type_id')
    .references(() => leaveTypes.id, { onDelete: 'cascade' })
    .notNull(),
  fiscalYear: varchar('fiscal_year', { length: 10 }).notNull(),
  totalDays: integer('total_days').default(0).notNull(),
  usedDays: integer('used_days').default(0).notNull(),
  carriedForwardDays: integer('carried_forward_days').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const leaveAllocationsRelations = relations(leaveAllocations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [leaveAllocations.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [leaveAllocations.employeeId],
    references: [employees.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveAllocations.leaveTypeId],
    references: [leaveTypes.id],
  }),
}));

export const leaveApplications = pgTable('leave_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  employeeId: uuid('employee_id')
    .references(() => employees.id, { onDelete: 'cascade' })
    .notNull(),
  leaveTypeId: uuid('leave_type_id')
    .references(() => leaveTypes.id, { onDelete: 'cascade' })
    .notNull(),
  fromDate: date('from_date').notNull(),
  toDate: date('to_date').notNull(),
  totalDays: integer('total_days').notNull(),
  reason: text('reason'),
  status: leaveApplicationStatusEnum('status').default('pending').notNull(),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectedReason: text('rejected_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('leave_applications_tenant_id_status_idx').on(table.tenantId, table.status),
]);

export const leaveApplicationsRelations = relations(leaveApplications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [leaveApplications.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [leaveApplications.employeeId],
    references: [employees.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveApplications.leaveTypeId],
    references: [leaveTypes.id],
  }),
  approver: one(users, {
    fields: [leaveApplications.approvedBy],
    references: [users.id],
  }),
}));

export const salaryStructures = pgTable('salary_structures', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const salaryStructuresRelations = relations(salaryStructures, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [salaryStructures.tenantId],
    references: [tenants.id],
  }),
  components: many(salaryStructureComponents),
  payrollEntries: many(payrollEntries),
}));

export const salaryComponents = pgTable('salary_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  type: salaryComponentTypeEnum('type').notNull(),
  isTaxable: boolean('is_taxable').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const salaryComponentsRelations = relations(salaryComponents, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [salaryComponents.tenantId],
    references: [tenants.id],
  }),
  structureComponents: many(salaryStructureComponents),
  payrollEntryComponents: many(payrollEntryComponents),
}));

export const salaryStructureComponents = pgTable('salary_structure_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  structureId: uuid('structure_id')
    .references(() => salaryStructures.id, { onDelete: 'cascade' })
    .notNull(),
  componentId: uuid('component_id')
    .references(() => salaryComponents.id, { onDelete: 'cascade' })
    .notNull(),
  formula: text('formula'),
  amount: decimal('amount', { precision: 20, scale: 4 }),
  percentage: decimal('percentage', { precision: 8, scale: 4 }),
  basedOn: varchar('based_on', { length: 255 }),
});

export const salaryStructureComponentsRelations = relations(
  salaryStructureComponents,
  ({ one }) => ({
    structure: one(salaryStructures, {
      fields: [salaryStructureComponents.structureId],
      references: [salaryStructures.id],
    }),
    component: one(salaryComponents, {
      fields: [salaryStructureComponents.componentId],
      references: [salaryComponents.id],
    }),
  }),
);

export const payrollEntries = pgTable('payroll_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  employeeId: uuid('employee_id')
    .references(() => employees.id, { onDelete: 'cascade' })
    .notNull(),
  period: varchar('period', { length: 10 }).notNull(),
  salaryStructureId: uuid('salary_structure_id')
    .references(() => salaryStructures.id, { onDelete: 'set null' }),
  grossPay: decimal('gross_pay', { precision: 20, scale: 4 }).default('0').notNull(),
  totalDeductions: decimal('total_deductions', { precision: 20, scale: 4 }).default('0').notNull(),
  netPay: decimal('net_pay', { precision: 20, scale: 4 }).default('0').notNull(),
  // Employer contributions (not part of gross/deductions, separate liability)
  employerEpf: decimal('employer_epf', { precision: 20, scale: 4 }).default('0'),
  employerEsic: decimal('employer_esic', { precision: 20, scale: 4 }).default('0'),
  // Attendance-based proration
  workingDays: integer('working_days'),
  presentDays: integer('present_days'),
  lopDays: integer('lop_days').default(0),
  status: payrollStatusEnum('payroll_entry_status').default('draft').notNull(),
  paidDate: date('paid_date'),
  paymentMethod: payrollPaymentMethodEnum('payroll_payment_method'),
  journalEntryId: uuid('journal_entry_id'), // linked after GL journal is posted
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const payrollEntriesRelations = relations(payrollEntries, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [payrollEntries.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [payrollEntries.employeeId],
    references: [employees.id],
  }),
  salaryStructure: one(salaryStructures, {
    fields: [payrollEntries.salaryStructureId],
    references: [salaryStructures.id],
  }),
  components: many(payrollEntryComponents),
}));

export const payrollEntryComponents = pgTable('payroll_entry_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  payrollEntryId: uuid('payroll_entry_id')
    .references(() => payrollEntries.id, { onDelete: 'cascade' })
    .notNull(),
  componentId: uuid('component_id')
    .references(() => salaryComponents.id, { onDelete: 'cascade' })
    .notNull(),
  amount: decimal('amount', { precision: 20, scale: 4 }).default('0').notNull(),
  type: salaryComponentTypeEnum('payroll_component_type').notNull(),
});

export const payrollEntryComponentsRelations = relations(
  payrollEntryComponents,
  ({ one }) => ({
    payrollEntry: one(payrollEntries, {
      fields: [payrollEntryComponents.payrollEntryId],
      references: [payrollEntries.id],
    }),
    component: one(salaryComponents, {
      fields: [payrollEntryComponents.componentId],
      references: [salaryComponents.id],
    }),
  }),
);

// ─── Tax Declarations (for IT deduction proofs under Old Regime) ───

export const taxDeclarations = pgTable('tax_declarations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  employeeId: uuid('employee_id')
    .references(() => employees.id, { onDelete: 'cascade' })
    .notNull(),
  fiscalYear: varchar('fiscal_year', { length: 10 }).notNull(), // e.g. "2025-26"
  section: taxDeclarationSectionEnum('section').notNull(),
  description: text('description'),
  declaredAmount: decimal('declared_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  proofSubmitted: boolean('proof_submitted').default(false).notNull(),
  approvedAmount: decimal('approved_amount', { precision: 20, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const taxDeclarationsRelations = relations(taxDeclarations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [taxDeclarations.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [taxDeclarations.employeeId],
    references: [employees.id],
  }),
}));

// ─── Expense Claims ────────────────────────────────────

export const expenseClaimStatusEnum = pgEnum('expense_claim_status', [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'paid',
  'cancelled',
]);

export const expenseClaims = pgTable('expense_claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  claimNumber: varchar('claim_number', { length: 50 }).notNull(),
  employeeId: uuid('employee_id')
    .references(() => employees.id, { onDelete: 'restrict' })
    .notNull(),
  claimDate: date('claim_date').notNull(),
  status: expenseClaimStatusEnum('status').default('draft').notNull(),
  totalAmount: decimal('total_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  approvedAmount: decimal('approved_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  purpose: text('purpose'),
  notes: text('notes'),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const expenseClaimsRelations = relations(expenseClaims, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [expenseClaims.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [expenseClaims.employeeId],
    references: [employees.id],
  }),
  approver: one(users, {
    fields: [expenseClaims.approvedBy],
    references: [users.id],
  }),
  lines: many(expenseClaimLines),
}));

export const expenseClaimLines = pgTable('expense_claim_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  expenseClaimId: uuid('expense_claim_id')
    .references(() => expenseClaims.id, { onDelete: 'cascade' })
    .notNull(),
  expenseDate: date('expense_date').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 20, scale: 4 }).notNull(),
  receipt: text('receipt'),
});

export const expenseClaimLinesRelations = relations(expenseClaimLines, ({ one }) => ({
  expenseClaim: one(expenseClaims, {
    fields: [expenseClaimLines.expenseClaimId],
    references: [expenseClaims.id],
  }),
}));

// ─── Recruitment ──────────────────────────────────────────

export const jobOpeningStatusEnum = pgEnum('job_opening_status', [
  'draft',
  'open',
  'on_hold',
  'closed',
  'cancelled',
]);

export const candidateStatusEnum = pgEnum('candidate_status', [
  'new',
  'screening',
  'shortlisted',
  'interview',
  'offered',
  'hired',
  'rejected',
  'withdrawn',
]);

export const interviewStatusEnum = pgEnum('interview_status', [
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
]);

export const offerStatusEnum = pgEnum('offer_status', [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
]);

export const jobOpenings = pgTable('job_openings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  designationId: uuid('designation_id').references(() => designations.id, { onDelete: 'set null' }),
  status: jobOpeningStatusEnum('status').default('draft').notNull(),
  positions: integer('positions').default(1).notNull(),
  filledPositions: integer('filled_positions').default(0).notNull(),
  description: text('description'),
  requirements: text('requirements'),
  location: varchar('location', { length: 255 }),
  employmentType: employmentTypeEnum('employment_type').default('full_time'),
  minSalary: decimal('min_salary', { precision: 20, scale: 4 }),
  maxSalary: decimal('max_salary', { precision: 20, scale: 4 }),
  publishDate: date('publish_date'),
  closingDate: date('closing_date'),
  hiringManager: uuid('hiring_manager').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const jobOpeningsRelations = relations(jobOpenings, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [jobOpenings.tenantId],
    references: [tenants.id],
  }),
  department: one(departments, {
    fields: [jobOpenings.departmentId],
    references: [departments.id],
  }),
  designation: one(designations, {
    fields: [jobOpenings.designationId],
    references: [designations.id],
  }),
  manager: one(users, {
    fields: [jobOpenings.hiringManager],
    references: [users.id],
  }),
  candidates: many(candidates),
}));

export const candidates = pgTable('candidates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  jobOpeningId: uuid('job_opening_id')
    .references(() => jobOpenings.id, { onDelete: 'cascade' })
    .notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  resumeUrl: text('resume_url'),
  currentCompany: varchar('current_company', { length: 255 }),
  currentDesignation: varchar('current_designation', { length: 255 }),
  experienceYears: integer('experience_years'),
  currentSalary: decimal('current_salary', { precision: 20, scale: 4 }),
  expectedSalary: decimal('expected_salary', { precision: 20, scale: 4 }),
  source: varchar('source', { length: 100 }),
  status: candidateStatusEnum('status').default('new').notNull(),
  rating: integer('rating'),
  notes: text('notes'),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
  hiredEmployeeId: uuid('hired_employee_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [candidates.tenantId],
    references: [tenants.id],
  }),
  jobOpening: one(jobOpenings, {
    fields: [candidates.jobOpeningId],
    references: [jobOpenings.id],
  }),
  interviews: many(interviews),
  offerLetters: many(offerLetters),
}));

export const interviews = pgTable('interviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  candidateId: uuid('candidate_id')
    .references(() => candidates.id, { onDelete: 'cascade' })
    .notNull(),
  interviewerIds: text('interviewer_ids').array(),
  round: integer('round').default(1).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  duration: integer('duration').default(60),
  location: varchar('location', { length: 255 }),
  meetingLink: varchar('meeting_link', { length: 500 }),
  status: interviewStatusEnum('interview_round_status').default('scheduled').notNull(),
  feedback: text('feedback'),
  rating: integer('rating'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const interviewsRelations = relations(interviews, ({ one }) => ({
  tenant: one(tenants, {
    fields: [interviews.tenantId],
    references: [tenants.id],
  }),
  candidate: one(candidates, {
    fields: [interviews.candidateId],
    references: [candidates.id],
  }),
}));

export const offerLetters = pgTable('offer_letters', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  candidateId: uuid('candidate_id')
    .references(() => candidates.id, { onDelete: 'cascade' })
    .notNull(),
  jobOpeningId: uuid('job_opening_id')
    .references(() => jobOpenings.id, { onDelete: 'cascade' })
    .notNull(),
  offerDate: date('offer_date').notNull(),
  joiningDate: date('joining_date'),
  offeredSalary: decimal('offered_salary', { precision: 20, scale: 4 }).notNull(),
  designation: varchar('designation', { length: 255 }),
  department: varchar('department', { length: 255 }),
  status: offerStatusEnum('offer_status').default('draft').notNull(),
  expiryDate: date('expiry_date'),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const offerLettersRelations = relations(offerLetters, ({ one }) => ({
  tenant: one(tenants, {
    fields: [offerLetters.tenantId],
    references: [tenants.id],
  }),
  candidate: one(candidates, {
    fields: [offerLetters.candidateId],
    references: [candidates.id],
  }),
  jobOpening: one(jobOpenings, {
    fields: [offerLetters.jobOpeningId],
    references: [jobOpenings.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type JobOpening = typeof jobOpenings.$inferSelect;
export type NewJobOpening = typeof jobOpenings.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;
export type OfferLetter = typeof offerLetters.$inferSelect;
export type NewOfferLetter = typeof offerLetters.$inferInsert;
export type ExpenseClaim = typeof expenseClaims.$inferSelect;
export type NewExpenseClaim = typeof expenseClaims.$inferInsert;
export type ExpenseClaimLine = typeof expenseClaimLines.$inferSelect;
export type NewExpenseClaimLine = typeof expenseClaimLines.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Designation = typeof designations.$inferSelect;
export type NewDesignation = typeof designations.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type NewLeaveType = typeof leaveTypes.$inferInsert;
export type LeaveAllocation = typeof leaveAllocations.$inferSelect;
export type NewLeaveAllocation = typeof leaveAllocations.$inferInsert;
export type LeaveApplication = typeof leaveApplications.$inferSelect;
export type NewLeaveApplication = typeof leaveApplications.$inferInsert;
export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type NewSalaryStructure = typeof salaryStructures.$inferInsert;
export type SalaryComponent = typeof salaryComponents.$inferSelect;
export type NewSalaryComponent = typeof salaryComponents.$inferInsert;
export type SalaryStructureComponent = typeof salaryStructureComponents.$inferSelect;
export type PayrollEntry = typeof payrollEntries.$inferSelect;
export type NewPayrollEntry = typeof payrollEntries.$inferInsert;
export type PayrollEntryComponent = typeof payrollEntryComponents.$inferSelect;
export type TaxDeclaration = typeof taxDeclarations.$inferSelect;
export type NewTaxDeclaration = typeof taxDeclarations.$inferInsert;
