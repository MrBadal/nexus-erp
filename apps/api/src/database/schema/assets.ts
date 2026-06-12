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

export const assetStatusEnum = pgEnum('asset_status', [
  'draft',
  'submitted',
  'in_use',
  'maintenance',
  'disposed',
  'scrapped',
]);

export const depreciationMethodEnum = pgEnum('depreciation_method', [
  'straight_line',
  'declining_balance',
  'double_declining',
  'units_of_production',
]);

export const maintenanceTypeEnum = pgEnum('maintenance_type', [
  'preventive',
  'corrective',
  'calibration',
  'inspection',
]);

export const maintenanceStatusEnum = pgEnum('maintenance_status', [
  'planned',
  'in_progress',
  'completed',
  'overdue',
]);

export const movementStatusEnum = pgEnum('movement_status', [
  'pending',
  'completed',
  'cancelled',
]);

// ─── Tables ─────────────────────────────────────────────

export const assetCategories = pgTable('asset_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  depreciationMethod: depreciationMethodEnum('depreciation_method').default('straight_line').notNull(),
  usefulLife: integer('useful_life').default(60).notNull(),
  accountId: uuid('account_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  assetNumber: varchar('asset_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  assetCategory: uuid('asset_category')
    .references(() => assetCategories.id, { onDelete: 'restrict' }),
  status: assetStatusEnum('status').default('draft').notNull(),
  location: varchar('location', { length: 255 }),
  department: varchar('department', { length: 255 }),
  custodian: uuid('custodian').references(() => users.id, { onDelete: 'set null' }),
  purchaseDate: date('purchase_date'),
  purchaseAmount: decimal('purchase_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  currentValue: decimal('current_value', { precision: 20, scale: 4 }).default('0').notNull(),
  depreciationMethod: depreciationMethodEnum('depreciation_method').default('straight_line').notNull(),
  usefulLife: integer('useful_life').default(60).notNull(),
  salvageValue: decimal('salvage_value', { precision: 20, scale: 4 }).default('0').notNull(),
  lastDepreciationDate: date('last_depreciation_date'),
  warrantyExpiry: date('warranty_expiry'),
  serialNumber: varchar('serial_number', { length: 255 }),
  description: text('description'),
  purchaseOrderId: uuid('purchase_order_id'),
  billId: uuid('bill_id'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const assetMaintenance = pgTable('asset_maintenance', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  assetId: uuid('asset_id')
    .references(() => assets.id, { onDelete: 'cascade' })
    .notNull(),
  maintenanceType: maintenanceTypeEnum('maintenance_type').default('preventive').notNull(),
  maintenanceDate: date('maintenance_date').notNull(),
  nextMaintenanceDate: date('next_maintenance_date'),
  cost: decimal('cost', { precision: 20, scale: 4 }).default('0').notNull(),
  performedBy: varchar('performed_by', { length: 255 }),
  description: text('description'),
  status: maintenanceStatusEnum('status').default('planned').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const assetMovements = pgTable('asset_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  assetId: uuid('asset_id')
    .references(() => assets.id, { onDelete: 'cascade' })
    .notNull(),
  fromLocation: varchar('from_location', { length: 255 }),
  toLocation: varchar('to_location', { length: 255 }),
  movementDate: date('movement_date').notNull(),
  reason: text('reason'),
  movedBy: uuid('moved_by').references(() => users.id, { onDelete: 'set null' }),
  status: movementStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── Relations ──────────────────────────────────────────

export const assetCategoriesRelations = relations(assetCategories, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [assetCategories.tenantId],
    references: [tenants.id],
  }),
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [assets.tenantId],
    references: [tenants.id],
  }),
  category: one(assetCategories, {
    fields: [assets.assetCategory],
    references: [assetCategories.id],
  }),
  custodianUser: one(users, {
    fields: [assets.custodian],
    references: [users.id],
    relationName: 'assetCustodian',
  }),
  creator: one(users, {
    fields: [assets.createdBy],
    references: [users.id],
    relationName: 'assetCreator',
  }),
  maintenanceRecords: many(assetMaintenance),
  movements: many(assetMovements),
}));

export const assetMaintenanceRelations = relations(assetMaintenance, ({ one }) => ({
  tenant: one(tenants, {
    fields: [assetMaintenance.tenantId],
    references: [tenants.id],
  }),
  asset: one(assets, {
    fields: [assetMaintenance.assetId],
    references: [assets.id],
  }),
  creator: one(users, {
    fields: [assetMaintenance.createdBy],
    references: [users.id],
  }),
}));

export const assetMovementsRelations = relations(assetMovements, ({ one }) => ({
  tenant: one(tenants, {
    fields: [assetMovements.tenantId],
    references: [tenants.id],
  }),
  asset: one(assets, {
    fields: [assetMovements.assetId],
    references: [assets.id],
  }),
  mover: one(users, {
    fields: [assetMovements.movedBy],
    references: [users.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type AssetCategory = typeof assetCategories.$inferSelect;
export type NewAssetCategory = typeof assetCategories.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AssetMaintenance = typeof assetMaintenance.$inferSelect;
export type NewAssetMaintenance = typeof assetMaintenance.$inferInsert;
export type AssetMovement = typeof assetMovements.$inferSelect;
export type NewAssetMovement = typeof assetMovements.$inferInsert;
