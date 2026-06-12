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
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

// ─── Enums ──────────────────────────────────────────────

export const itemTypeEnum = pgEnum('item_type', [
  'stock',
  'service',
  'consumable',
]);

export const unitOfMeasureEnum = pgEnum('unit_of_measure', [
  'each',
  'kg',
  'g',
  'lb',
  'oz',
  'litre',
  'ml',
  'gallon',
  'box',
  'pack',
  'carton',
  'pallet',
  'metre',
  'cm',
  'inch',
  'foot',
  'sq_metre',
  'sq_foot',
  'cubic_metre',
  'pair',
  'dozen',
  'set',
  'hour',
  'day',
  'unit',
]);

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'receipt',
  'issue',
  'transfer',
  'adjustment',
  'return',
]);

export const stockAdjustmentStatusEnum = pgEnum('stock_adjustment_status', [
  'draft',
  'submitted',
  'approved',
]);

export const valuationMethodEnum = pgEnum('valuation_method', [
  'weighted_average',
  'fifo',
  'manual',
]);

// ─── Tables ─────────────────────────────────────────────

export const warehouses = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  isDefault: boolean('is_default').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [warehouses.tenantId],
    references: [tenants.id],
  }),
  itemWarehouses: many(itemWarehouses),
  stockMovements: many(stockMovements),
  stockAdjustments: many(stockAdjustments),
}));

export const itemCategories = pgTable('item_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  parentId: uuid('parent_id'),
  slug: varchar('slug', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const itemCategoriesRelations = relations(itemCategories, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [itemCategories.tenantId],
    references: [tenants.id],
  }),
  parent: one(itemCategories, {
    fields: [itemCategories.parentId],
    references: [itemCategories.id],
    relationName: 'categoryParentChild',
  }),
  children: many(itemCategories, { relationName: 'categoryParentChild' }),
  items: many(items),
}));

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull(),
  description: text('description'),
  categoryId: uuid('category_id'),
  itemType: itemTypeEnum('item_type').default('stock').notNull(),
  unit: unitOfMeasureEnum('unit').default('each').notNull(),
  purchasePrice: decimal('purchase_price', { precision: 20, scale: 4 }).default('0').notNull(),
  sellingPrice: decimal('selling_price', { precision: 20, scale: 4 }).default('0').notNull(),
  taxRate: decimal('tax_rate', { precision: 8, scale: 4 }).default('0').notNull(),
  hsnCode: varchar('hsn_code', { length: 20 }),
  defaultTaxRateId: uuid('default_tax_rate_id'),
  isActive: boolean('is_active').default(true).notNull(),
  imageUrl: text('image_url'),
  valuationMethod: valuationMethodEnum('valuation_method').default('weighted_average'),
  defaultSupplierId: uuid('default_supplier_id'), // links to buying.suppliers
  minStockLevel: integer('min_stock_level').default(0).notNull(),
  reorderQuantity: integer('reorder_quantity').default(0).notNull(),
  weight: decimal('weight', { precision: 12, scale: 4 }),
  dimensions: varchar('dimensions', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('items_tenant_id_idx').on(table.tenantId),
  index('items_tenant_id_code_idx').on(table.tenantId, table.code),
]);

export const itemsRelations = relations(items, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [items.tenantId],
    references: [tenants.id],
  }),
  category: one(itemCategories, {
    fields: [items.categoryId],
    references: [itemCategories.id],
  }),
  itemWarehouses: many(itemWarehouses),
  stockMovements: many(stockMovements),
}));

export const itemWarehouses = pgTable('item_warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'cascade' })
    .notNull(),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id, { onDelete: 'cascade' })
    .notNull(),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).default('0').notNull(),
  reservedQuantity: decimal('reserved_quantity', { precision: 20, scale: 4 }).default('0').notNull(),
  valuationRate: decimal('valuation_rate', { precision: 20, scale: 4 }).default('0').notNull(),
  reorderLevel: integer('reorder_level').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('item_warehouses_tenant_id_item_id_idx').on(table.tenantId, table.itemId),
]);

export const itemWarehousesRelations = relations(itemWarehouses, ({ one }) => ({
  tenant: one(tenants, {
    fields: [itemWarehouses.tenantId],
    references: [tenants.id],
  }),
  item: one(items, {
    fields: [itemWarehouses.itemId],
    references: [items.id],
  }),
  warehouse: one(warehouses, {
    fields: [itemWarehouses.warehouseId],
    references: [warehouses.id],
  }),
}));

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id, { onDelete: 'restrict' })
    .notNull(),
  toWarehouseId: uuid('to_warehouse_id'),
  movementType: stockMovementTypeEnum('movement_type').notNull(),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 20, scale: 4 }),
  reference: varchar('reference', { length: 255 }),
  description: text('description'),
  sourceType: varchar('source_type', { length: 100 }),
  sourceId: uuid('source_id'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('stock_movements_tenant_id_created_at_idx').on(table.tenantId, table.createdAt),
]);

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  tenant: one(tenants, {
    fields: [stockMovements.tenantId],
    references: [tenants.id],
  }),
  item: one(items, {
    fields: [stockMovements.itemId],
    references: [items.id],
  }),
  warehouse: one(warehouses, {
    fields: [stockMovements.warehouseId],
    references: [warehouses.id],
  }),
  toWarehouse: one(warehouses, {
    fields: [stockMovements.toWarehouseId],
    references: [warehouses.id],
    relationName: 'transferToWarehouse',
  }),
  creator: one(users, {
    fields: [stockMovements.createdBy],
    references: [users.id],
  }),
}));

export const stockAdjustments = pgTable('stock_adjustments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  adjustmentNumber: varchar('adjustment_number', { length: 50 }).notNull(),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id, { onDelete: 'restrict' })
    .notNull(),
  reason: varchar('reason', { length: 255 }).notNull(),
  status: stockAdjustmentStatusEnum('status').default('draft').notNull(),
  notes: text('notes'),
  adjustedBy: uuid('adjusted_by').references(() => users.id, { onDelete: 'set null' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [stockAdjustments.tenantId],
    references: [tenants.id],
  }),
  warehouse: one(warehouses, {
    fields: [stockAdjustments.warehouseId],
    references: [warehouses.id],
  }),
  adjuster: one(users, {
    fields: [stockAdjustments.adjustedBy],
    references: [users.id],
    relationName: 'adjustmentAdjuster',
  }),
  approver: one(users, {
    fields: [stockAdjustments.approvedBy],
    references: [users.id],
    relationName: 'adjustmentApprover',
  }),
  lines: many(stockAdjustmentLines),
}));

export const stockAdjustmentLines = pgTable('stock_adjustment_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  adjustmentId: uuid('adjustment_id')
    .references(() => stockAdjustments.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  currentQty: decimal('current_qty', { precision: 20, scale: 4 }).notNull(),
  adjustedQty: decimal('adjusted_qty', { precision: 20, scale: 4 }).notNull(),
  differenceQty: decimal('difference_qty', { precision: 20, scale: 4 }).notNull(),
  reason: varchar('reason', { length: 255 }),
});

export const stockAdjustmentLinesRelations = relations(stockAdjustmentLines, ({ one }) => ({
  adjustment: one(stockAdjustments, {
    fields: [stockAdjustmentLines.adjustmentId],
    references: [stockAdjustments.id],
  }),
  item: one(items, {
    fields: [stockAdjustmentLines.itemId],
    references: [items.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
export type ItemCategory = typeof itemCategories.$inferSelect;
export type NewItemCategory = typeof itemCategories.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type ItemWarehouse = typeof itemWarehouses.$inferSelect;
export type NewItemWarehouse = typeof itemWarehouses.$inferInsert;
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
export type StockAdjustment = typeof stockAdjustments.$inferSelect;
export type NewStockAdjustment = typeof stockAdjustments.$inferInsert;
export type StockAdjustmentLine = typeof stockAdjustmentLines.$inferSelect;
export type NewStockAdjustmentLine = typeof stockAdjustmentLines.$inferInsert;
