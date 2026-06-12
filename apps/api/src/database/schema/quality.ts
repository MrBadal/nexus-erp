import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  date,
  decimal,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

// ─── Enums ──────────────────────────────────────────────

export const inspectionReferenceTypeEnum = pgEnum('inspection_reference_type', [
  'incoming',
  'in_process',
  'outgoing',
]);

export const inspectionStatusEnum = pgEnum('inspection_status', [
  'draft',
  'in_progress',
  'accepted',
  'rejected',
  'on_hold',
]);

export const inspectionReadingStatusEnum = pgEnum('inspection_reading_status', [
  'accepted',
  'rejected',
]);

export const ncrSeverityEnum = pgEnum('ncr_severity', [
  'minor',
  'major',
  'critical',
]);

export const ncrStatusEnum = pgEnum('ncr_status', [
  'open',
  'investigation',
  'corrective_action',
  'closed',
  'void',
]);

// ─── Tables ─────────────────────────────────────────────

export const qualityInspections = pgTable('quality_inspections', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  inspectionNumber: varchar('inspection_number', { length: 50 }).notNull(),
  referenceType: inspectionReferenceTypeEnum('reference_type').notNull(),
  referenceId: uuid('reference_id'),
  referenceName: varchar('reference_name', { length: 255 }),
  itemId: uuid('item_id'),
  itemName: varchar('item_name', { length: 255 }),
  inspectedBy: uuid('inspected_by').references(() => users.id, { onDelete: 'set null' }),
  inspectionDate: date('inspection_date').notNull(),
  status: inspectionStatusEnum('status').default('draft').notNull(),
  batchNumber: varchar('batch_number', { length: 100 }),
  sampleSize: integer('sample_size'),
  acceptedQuantity: integer('accepted_quantity'),
  rejectedQuantity: integer('rejected_quantity'),
  remarks: text('remarks'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const qualityInspectionReadings = pgTable('quality_inspection_readings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  inspectionId: uuid('inspection_id')
    .references(() => qualityInspections.id, { onDelete: 'cascade' })
    .notNull(),
  parameter: varchar('parameter', { length: 255 }).notNull(),
  specification: varchar('specification', { length: 255 }),
  minValue: decimal('min_value', { precision: 20, scale: 4 }),
  maxValue: decimal('max_value', { precision: 20, scale: 4 }),
  actualValue: decimal('actual_value', { precision: 20, scale: 4 }),
  status: inspectionReadingStatusEnum('status').default('accepted').notNull(),
  remarks: text('remarks'),
});

export const qualityProcedures = pgTable('quality_procedures', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  processOwner: varchar('process_owner', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
  steps: text('steps'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const nonConformanceReports = pgTable('non_conformance_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  ncrNumber: varchar('ncr_number', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  inspectionId: uuid('inspection_id').references(() => qualityInspections.id, { onDelete: 'set null' }),
  severity: ncrSeverityEnum('severity').default('minor').notNull(),
  status: ncrStatusEnum('status').default('open').notNull(),
  rootCause: text('root_cause'),
  correctiveAction: text('corrective_action'),
  preventiveAction: text('preventive_action'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  dueDate: date('due_date'),
  closedDate: date('closed_date'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── Relations ──────────────────────────────────────────

export const qualityInspectionsRelations = relations(qualityInspections, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [qualityInspections.tenantId],
    references: [tenants.id],
  }),
  inspector: one(users, {
    fields: [qualityInspections.inspectedBy],
    references: [users.id],
  }),
  readings: many(qualityInspectionReadings),
  nonConformanceReports: many(nonConformanceReports),
}));

export const qualityInspectionReadingsRelations = relations(qualityInspectionReadings, ({ one }) => ({
  inspection: one(qualityInspections, {
    fields: [qualityInspectionReadings.inspectionId],
    references: [qualityInspections.id],
  }),
}));

export const qualityProceduresRelations = relations(qualityProcedures, ({ one }) => ({
  tenant: one(tenants, {
    fields: [qualityProcedures.tenantId],
    references: [tenants.id],
  }),
}));

export const nonConformanceReportsRelations = relations(nonConformanceReports, ({ one }) => ({
  tenant: one(tenants, {
    fields: [nonConformanceReports.tenantId],
    references: [tenants.id],
  }),
  inspection: one(qualityInspections, {
    fields: [nonConformanceReports.inspectionId],
    references: [qualityInspections.id],
  }),
  assignee: one(users, {
    fields: [nonConformanceReports.assignedTo],
    references: [users.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type QualityInspection = typeof qualityInspections.$inferSelect;
export type NewQualityInspection = typeof qualityInspections.$inferInsert;
export type QualityInspectionReading = typeof qualityInspectionReadings.$inferSelect;
export type NewQualityInspectionReading = typeof qualityInspectionReadings.$inferInsert;
export type QualityProcedure = typeof qualityProcedures.$inferSelect;
export type NewQualityProcedure = typeof qualityProcedures.$inferInsert;
export type NonConformanceReport = typeof nonConformanceReports.$inferSelect;
export type NewNonConformanceReport = typeof nonConformanceReports.$inferInsert;
