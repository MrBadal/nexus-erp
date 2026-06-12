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
import { items } from './inventory';

// ─── Enums ──────────────────────────────────────────────

export const bomStatusEnum = pgEnum('bom_status', [
  'draft',
  'active',
  'inactive',
]);

export const workOrderStatusEnum = pgEnum('work_order_status', [
  'draft',
  'not_started',
  'in_progress',
  'completed',
  'stopped',
  'cancelled',
]);

export const workOrderPriorityEnum = pgEnum('work_order_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const workOrderOperationStatusEnum = pgEnum('work_order_operation_status', [
  'pending',
  'in_progress',
  'completed',
  'skipped',
]);

// ─── Tables ─────────────────────────────────────────────

export const boms = pgTable('boms', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  bomNumber: varchar('bom_number', { length: 50 }).notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).default('1').notNull(),
  uom: varchar('uom', { length: 50 }).default('Nos').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  status: bomStatusEnum('status').default('draft').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const bomItems = pgTable('bom_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  bomId: uuid('bom_id')
    .references(() => boms.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
  uom: varchar('uom', { length: 50 }).default('Nos').notNull(),
  rate: decimal('rate', { precision: 20, scale: 4 }).default('0').notNull(),
  amount: decimal('amount', { precision: 20, scale: 4 }).default('0').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const workOrders = pgTable('work_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  workOrderNumber: varchar('work_order_number', { length: 50 }).notNull(),
  bomId: uuid('bom_id')
    .references(() => boms.id, { onDelete: 'restrict' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
  pendingQty: decimal('pending_qty', { precision: 20, scale: 4 }).default('0').notNull(),
  completedQty: decimal('completed_qty', { precision: 20, scale: 4 }).default('0').notNull(),
  uom: varchar('uom', { length: 50 }).default('Nos').notNull(),
  plannedStartDate: date('planned_start_date'),
  plannedEndDate: date('planned_end_date'),
  actualStartDate: date('actual_start_date'),
  actualEndDate: date('actual_end_date'),
  status: workOrderStatusEnum('status').default('draft').notNull(),
  priority: workOrderPriorityEnum('priority').default('medium').notNull(),
  warehouse: varchar('warehouse', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const workOrderOperations = pgTable('work_order_operations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  workOrderId: uuid('work_order_id')
    .references(() => workOrders.id, { onDelete: 'cascade' })
    .notNull(),
  operationName: varchar('operation_name', { length: 255 }).notNull(),
  workstation: varchar('workstation', { length: 255 }),
  plannedTime: decimal('planned_time', { precision: 10, scale: 2 }).default('0').notNull(),
  actualTime: decimal('actual_time', { precision: 10, scale: 2 }).default('0').notNull(),
  status: workOrderOperationStatusEnum('status').default('pending').notNull(),
  sequence: integer('sequence').default(0).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const workstations = pgTable('workstations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  hourlyRate: decimal('hourly_rate', { precision: 20, scale: 4 }).default('0').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  productionCapacity: integer('production_capacity').default(0).notNull(),
  workingHours: decimal('working_hours', { precision: 5, scale: 2 }).default('8').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const operations = pgTable('operations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  workstation: varchar('workstation', { length: 255 }),
  defaultTime: decimal('default_time', { precision: 10, scale: 2 }).default('0').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── Relations ──────────────────────────────────────────

export const bomsRelations = relations(boms, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [boms.tenantId],
    references: [tenants.id],
  }),
  item: one(items, {
    fields: [boms.itemId],
    references: [items.id],
  }),
  bomItems: many(bomItems),
  workOrders: many(workOrders),
}));

export const bomItemsRelations = relations(bomItems, ({ one }) => ({
  tenant: one(tenants, {
    fields: [bomItems.tenantId],
    references: [tenants.id],
  }),
  bom: one(boms, {
    fields: [bomItems.bomId],
    references: [boms.id],
  }),
  item: one(items, {
    fields: [bomItems.itemId],
    references: [items.id],
  }),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [workOrders.tenantId],
    references: [tenants.id],
  }),
  bom: one(boms, {
    fields: [workOrders.bomId],
    references: [boms.id],
  }),
  item: one(items, {
    fields: [workOrders.itemId],
    references: [items.id],
  }),
  operations: many(workOrderOperations),
}));

export const workOrderOperationsRelations = relations(workOrderOperations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [workOrderOperations.tenantId],
    references: [tenants.id],
  }),
  workOrder: one(workOrders, {
    fields: [workOrderOperations.workOrderId],
    references: [workOrders.id],
  }),
}));

export const workstationsRelations = relations(workstations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [workstations.tenantId],
    references: [tenants.id],
  }),
}));

export const operationsRelations = relations(operations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [operations.tenantId],
    references: [tenants.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type BOM = typeof boms.$inferSelect;
export type NewBOM = typeof boms.$inferInsert;
export type BOMItem = typeof bomItems.$inferSelect;
export type NewBOMItem = typeof bomItems.$inferInsert;
export type WorkOrder = typeof workOrders.$inferSelect;
export type NewWorkOrder = typeof workOrders.$inferInsert;
export type WorkOrderOperation = typeof workOrderOperations.$inferSelect;
export type NewWorkOrderOperation = typeof workOrderOperations.$inferInsert;
export type Workstation = typeof workstations.$inferSelect;
export type NewWorkstation = typeof workstations.$inferInsert;
export type Operation = typeof operations.$inferSelect;
export type NewOperation = typeof operations.$inferInsert;
