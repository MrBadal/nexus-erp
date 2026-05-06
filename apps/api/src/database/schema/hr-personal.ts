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
import { employees } from './hr';

// ─── Enums ──────────────────────────────────────────────

export const employeeFamilyRelationshipEnum = pgEnum(
  'employee_family_relationship',
  ['spouse', 'father', 'mother', 'son', 'daughter', 'sibling', 'other'],
);

export const employeeSkillProficiencyEnum = pgEnum(
  'employee_skill_proficiency',
  ['beginner', 'intermediate', 'advanced', 'expert'],
);

// ─── Education ──────────────────────────────────────────

export const employeeEducation = pgTable(
  'employee_education',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    degree: varchar('degree', { length: 100 }).notNull(),
    institution: varchar('institution', { length: 255 }).notNull(),
    fieldOfStudy: varchar('field_of_study', { length: 100 }),
    startYear: integer('start_year').notNull(),
    endYear: integer('end_year'),
    grade: varchar('grade', { length: 50 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('employee_education_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
  ],
);

export const employeeEducationRelations = relations(
  employeeEducation,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [employeeEducation.tenantId],
      references: [tenants.id],
    }),
    employee: one(employees, {
      fields: [employeeEducation.employeeId],
      references: [employees.id],
    }),
  }),
);

export type EmployeeEducation = typeof employeeEducation.$inferSelect;
export type NewEmployeeEducation = typeof employeeEducation.$inferInsert;

// ─── Experience ─────────────────────────────────────────

export const employeeExperience = pgTable(
  'employee_experience',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    title: varchar('title', { length: 150 }).notNull(),
    fromDate: date('from_date').notNull(),
    toDate: date('to_date'),
    employmentType: varchar('employment_type', { length: 30 }),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('employee_experience_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
  ],
);

export const employeeExperienceRelations = relations(
  employeeExperience,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [employeeExperience.tenantId],
      references: [tenants.id],
    }),
    employee: one(employees, {
      fields: [employeeExperience.employeeId],
      references: [employees.id],
    }),
  }),
);

export type EmployeeExperience = typeof employeeExperience.$inferSelect;
export type NewEmployeeExperience = typeof employeeExperience.$inferInsert;

// ─── Family / Nominee ───────────────────────────────────

export const employeeFamily = pgTable(
  'employee_family',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    relationship: employeeFamilyRelationshipEnum('relationship').notNull(),
    dateOfBirth: date('date_of_birth'),
    nominee: boolean('nominee').default(false).notNull(),
    nomineeSharePercent: integer('nominee_share_percent'),
    aadhaarNumber: varchar('aadhaar_number', { length: 12 }),
    contactPhone: varchar('contact_phone', { length: 20 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('employee_family_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
  ],
);

export const employeeFamilyRelations = relations(employeeFamily, ({ one }) => ({
  tenant: one(tenants, {
    fields: [employeeFamily.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [employeeFamily.employeeId],
    references: [employees.id],
  }),
}));

export type EmployeeFamily = typeof employeeFamily.$inferSelect;
export type NewEmployeeFamily = typeof employeeFamily.$inferInsert;

// ─── Skills / Certifications ────────────────────────────

export const employeeSkills = pgTable(
  'employee_skills',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    skill: varchar('skill', { length: 150 }).notNull(),
    category: varchar('category', { length: 80 }),
    proficiency: employeeSkillProficiencyEnum('proficiency')
      .default('intermediate')
      .notNull(),
    yearsOfExperience: decimal('years_of_experience', {
      precision: 5,
      scale: 2,
    }),
    certificationName: varchar('certification_name', { length: 200 }),
    certificationIssuer: varchar('certification_issuer', { length: 200 }),
    certificationDate: date('certification_date'),
    certificationExpiresAt: date('certification_expires_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('employee_skills_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
  ],
);

export const employeeSkillsRelations = relations(employeeSkills, ({ one }) => ({
  tenant: one(tenants, {
    fields: [employeeSkills.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [employeeSkills.employeeId],
    references: [employees.id],
  }),
}));

export type EmployeeSkill = typeof employeeSkills.$inferSelect;
export type NewEmployeeSkill = typeof employeeSkills.$inferInsert;
