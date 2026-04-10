import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { items } from './inventory';
import { warehouses } from './inventory';

// ─── Enums ──────────────────────────────────────────────

export const msmeCategoryEnum = pgEnum('msme_category', [
  'micro',
  'small',
  'medium',
]);

export const supplierStatusEnum = pgEnum('supplier_status', [
  'active',
  'inactive',
]);

export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'draft',
  'submitted',
  'approved',
  'received',
  'partially_received',
  'cancelled',
]);

export const purchaseReceiptStatusEnum = pgEnum('purchase_receipt_status', [
  'draft',
  'submitted',
  'completed',
]);

export const supplierQuotationStatusEnum = pgEnum('supplier_quotation_status', [
  'draft',
  'received',
  'accepted',
  'rejected',
]);

// ─── Tables ─────────────────────────────────────────────

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 255 }),
  taxId: varchar('tax_id', { length: 100 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  paymentTerms: varchar('payment_terms', { length: 100 }),
  status: supplierStatusEnum('status').default('active').notNull(),
  rating: integer('rating').default(0).notNull(),
  contactId: uuid('contact_id'),
  notes: text('notes'),
  website: varchar('website', { length: 255 }),
  panNumber: varchar('pan_number', { length: 10 }),
  gstNumber: varchar('gst_number', { length: 15 }),
  msmeRegistered: boolean('msme_registered').default(false).notNull(),
  msmeCategory: msmeCategoryEnum('msme_category'),
  msmeNumber: varchar('msme_number', { length: 30 }),
  bankAccountName: varchar('bank_account_name', { length: 255 }),
  bankAccountNumber: varchar('bank_account_number', { length: 30 }),
  bankIfscCode: varchar('bank_ifsc_code', { length: 11 }),
  bankName: varchar('bank_name', { length: 255 }),
  bankBranch: varchar('bank_branch', { length: 255 }),
  tdsApplicable: boolean('tds_applicable').default(true).notNull(),
  defaultTdsSectionId: uuid('default_tds_section_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('suppliers_tenant_id_idx').on(table.tenantId),
  index('suppliers_tenant_pan_idx').on(table.tenantId, table.panNumber),
  index('suppliers_tenant_gst_idx').on(table.tenantId, table.gstNumber),
]);

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [suppliers.tenantId],
    references: [tenants.id],
  }),
  purchaseOrders: many(purchaseOrders),
  purchaseReceipts: many(purchaseReceipts),
  supplierQuotations: many(supplierQuotations),
}));

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  supplierId: uuid('supplier_id')
    .references(() => suppliers.id, { onDelete: 'restrict' })
    .notNull(),
  orderDate: date('order_date').notNull(),
  expectedDelivery: date('expected_delivery'),
  status: purchaseOrderStatusEnum('status').default('draft').notNull(),
  subtotal: decimal('subtotal', { precision: 20, scale: 4 }).default('0').notNull(),
  taxAmount: decimal('tax_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  discountAmount: decimal('discount_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  totalAmount: decimal('total_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  notes: text('notes'),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  version: integer('version').default(1).notNull(),
  amendedFromId: uuid('amended_from_id'),
  amendmentReason: text('amendment_reason'),
  advanceAmount: decimal('advance_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  advancePercentage: decimal('advance_percentage', { precision: 8, scale: 4 }),
  advancePaid: decimal('advance_paid', { precision: 20, scale: 4 }).default('0').notNull(),
  isPendingApproval: boolean('is_pending_approval').default(false).notNull(),
}, (table) => [
  index('purchase_orders_tenant_id_idx').on(table.tenantId),
  index('purchase_orders_tenant_id_status_idx').on(table.tenantId, table.status),
]);

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [purchaseOrders.tenantId],
    references: [tenants.id],
  }),
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  approver: one(users, {
    fields: [purchaseOrders.approvedBy],
    references: [users.id],
    relationName: 'poApprover',
  }),
  creator: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id],
    relationName: 'poCreator',
  }),
  lines: many(purchaseOrderLines),
  receipts: many(purchaseReceipts),
}));

export const purchaseOrderLines = pgTable('purchase_order_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  purchaseOrderId: uuid('purchase_order_id')
    .references(() => purchaseOrders.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
  receivedQty: decimal('received_qty', { precision: 20, scale: 4 }).default('0').notNull(),
  unitPrice: decimal('unit_price', { precision: 20, scale: 4 }).notNull(),
  discount: decimal('discount', { precision: 20, scale: 4 }).default('0').notNull(),
  taxRate: decimal('tax_rate', { precision: 8, scale: 4 }).default('0').notNull(),
  lineTotal: decimal('line_total', { precision: 20, scale: 4 }).default('0').notNull(),
});

export const purchaseOrderLinesRelations = relations(purchaseOrderLines, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderLines.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  item: one(items, {
    fields: [purchaseOrderLines.itemId],
    references: [items.id],
  }),
}));

export const poAmendments = pgTable('po_amendments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrders.id, { onDelete: 'cascade' }).notNull(),
  version: integer('version').notNull(),
  fieldName: varchar('field_name', { length: 100 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('po_amendments_po_id_idx').on(table.purchaseOrderId),
]);

export const poAmendmentsRelations = relations(poAmendments, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [poAmendments.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}));

export const purchaseReceipts = pgTable('purchase_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull(),
  purchaseOrderId: uuid('purchase_order_id')
    .references(() => purchaseOrders.id, { onDelete: 'restrict' }),
  supplierId: uuid('supplier_id')
    .references(() => suppliers.id, { onDelete: 'restrict' })
    .notNull(),
  receiptDate: date('receipt_date').notNull(),
  status: purchaseReceiptStatusEnum('status').default('draft').notNull(),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id, { onDelete: 'restrict' })
    .notNull(),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const purchaseReceiptsRelations = relations(purchaseReceipts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [purchaseReceipts.tenantId],
    references: [tenants.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseReceipts.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  supplier: one(suppliers, {
    fields: [purchaseReceipts.supplierId],
    references: [suppliers.id],
  }),
  warehouse: one(warehouses, {
    fields: [purchaseReceipts.warehouseId],
    references: [warehouses.id],
  }),
  creator: one(users, {
    fields: [purchaseReceipts.createdBy],
    references: [users.id],
  }),
  lines: many(purchaseReceiptLines),
}));

export const purchaseReceiptLines = pgTable('purchase_receipt_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  purchaseReceiptId: uuid('purchase_receipt_id')
    .references(() => purchaseReceipts.id, { onDelete: 'cascade' })
    .notNull(),
  purchaseOrderLineId: uuid('purchase_order_line_id')
    .references(() => purchaseOrderLines.id, { onDelete: 'set null' }),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  acceptedQty: decimal('accepted_qty', { precision: 20, scale: 4 }).default('0').notNull(),
  rejectedQty: decimal('rejected_qty', { precision: 20, scale: 4 }).default('0').notNull(),
  rejectedReason: text('rejected_reason'),
});

export const purchaseReceiptLinesRelations = relations(purchaseReceiptLines, ({ one }) => ({
  purchaseReceipt: one(purchaseReceipts, {
    fields: [purchaseReceiptLines.purchaseReceiptId],
    references: [purchaseReceipts.id],
  }),
  purchaseOrderLine: one(purchaseOrderLines, {
    fields: [purchaseReceiptLines.purchaseOrderLineId],
    references: [purchaseOrderLines.id],
  }),
  item: one(items, {
    fields: [purchaseReceiptLines.itemId],
    references: [items.id],
  }),
}));

export const supplierQuotations = pgTable('supplier_quotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  quotationNumber: varchar('quotation_number', { length: 50 }).notNull(),
  supplierId: uuid('supplier_id')
    .references(() => suppliers.id, { onDelete: 'restrict' })
    .notNull(),
  requestDate: date('request_date').notNull(),
  validUntil: date('valid_until'),
  status: supplierQuotationStatusEnum('status').default('draft').notNull(),
  notes: text('notes'),
  totalAmount: decimal('total_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const supplierQuotationsRelations = relations(supplierQuotations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [supplierQuotations.tenantId],
    references: [tenants.id],
  }),
  supplier: one(suppliers, {
    fields: [supplierQuotations.supplierId],
    references: [suppliers.id],
  }),
  creator: one(users, {
    fields: [supplierQuotations.createdBy],
    references: [users.id],
  }),
  lines: many(supplierQuotationLines),
}));

export const supplierQuotationLines = pgTable('supplier_quotation_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationId: uuid('quotation_id')
    .references(() => supplierQuotations.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 20, scale: 4 }).notNull(),
  leadTime: integer('lead_time'),
});

export const supplierQuotationLinesRelations = relations(supplierQuotationLines, ({ one }) => ({
  quotation: one(supplierQuotations, {
    fields: [supplierQuotationLines.quotationId],
    references: [supplierQuotations.id],
  }),
  item: one(items, {
    fields: [supplierQuotationLines.itemId],
    references: [items.id],
  }),
}));

// ─── Material Requests ─────────────────────────────────

export const materialRequestStatusEnum = pgEnum('material_request_status', [
  'draft',
  'submitted',
  'approved',
  'partially_ordered',
  'ordered',
  'rejected',
  'cancelled',
]);

export const materialRequestTypeEnum = pgEnum('material_request_type', [
  'purchase',
  'transfer',
  'manufacture',
]);

export const materialRequests = pgTable('material_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  requestNumber: varchar('request_number', { length: 50 }).notNull(),
  requestType: materialRequestTypeEnum('request_type').default('purchase').notNull(),
  requestDate: date('request_date').notNull(),
  requiredDate: date('required_date'),
  status: materialRequestStatusEnum('status').default('draft').notNull(),
  department: varchar('department', { length: 100 }),
  purpose: text('purpose'),
  notes: text('notes'),
  requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isPendingApproval: boolean('is_pending_approval').default(false).notNull(),
});

export const materialRequestsRelations = relations(materialRequests, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [materialRequests.tenantId],
    references: [tenants.id],
  }),
  requester: one(users, {
    fields: [materialRequests.requestedBy],
    references: [users.id],
    relationName: 'mrRequester',
  }),
  approver: one(users, {
    fields: [materialRequests.approvedBy],
    references: [users.id],
    relationName: 'mrApprover',
  }),
  lines: many(materialRequestLines),
}));

export const materialRequestLines = pgTable('material_request_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  materialRequestId: uuid('material_request_id')
    .references(() => materialRequests.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
  orderedQty: decimal('ordered_qty', { precision: 20, scale: 4 }).default('0').notNull(),
  uom: varchar('uom', { length: 20 }).default('Nos').notNull(),
  preferredSupplierId: uuid('preferred_supplier_id')
    .references(() => suppliers.id, { onDelete: 'set null' }),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id, { onDelete: 'set null' }),
});

export const materialRequestLinesRelations = relations(materialRequestLines, ({ one }) => ({
  materialRequest: one(materialRequests, {
    fields: [materialRequestLines.materialRequestId],
    references: [materialRequests.id],
  }),
  item: one(items, {
    fields: [materialRequestLines.itemId],
    references: [items.id],
  }),
  preferredSupplier: one(suppliers, {
    fields: [materialRequestLines.preferredSupplierId],
    references: [suppliers.id],
  }),
  warehouse: one(warehouses, {
    fields: [materialRequestLines.warehouseId],
    references: [warehouses.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type MaterialRequest = typeof materialRequests.$inferSelect;
export type NewMaterialRequest = typeof materialRequests.$inferInsert;
export type MaterialRequestLine = typeof materialRequestLines.$inferSelect;
export type NewMaterialRequestLine = typeof materialRequestLines.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderLine = typeof purchaseOrderLines.$inferSelect;
export type NewPurchaseOrderLine = typeof purchaseOrderLines.$inferInsert;
export type PoAmendment = typeof poAmendments.$inferSelect;
export type NewPoAmendment = typeof poAmendments.$inferInsert;
export type PurchaseReceipt = typeof purchaseReceipts.$inferSelect;
export type NewPurchaseReceipt = typeof purchaseReceipts.$inferInsert;
export type PurchaseReceiptLine = typeof purchaseReceiptLines.$inferSelect;
export type NewPurchaseReceiptLine = typeof purchaseReceiptLines.$inferInsert;
export type SupplierQuotation = typeof supplierQuotations.$inferSelect;
export type NewSupplierQuotation = typeof supplierQuotations.$inferInsert;
export type SupplierQuotationLine = typeof supplierQuotationLines.$inferSelect;
export type NewSupplierQuotationLine = typeof supplierQuotationLines.$inferInsert;
