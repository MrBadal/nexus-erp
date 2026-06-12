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
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { items } from './inventory';

// ─── Enums ──────────────────────────────────────────────

export const customerStatusEnum = pgEnum('customer_status', [
  'active',
  'inactive',
  'blocked',
]);

export const customerTypeEnum = pgEnum('customer_type', [
  'individual',
  'company',
]);

export const salesOrderStatusEnum = pgEnum('sales_order_status', [
  'draft',
  'confirmed',
  'delivered',
  'invoiced',
  'cancelled',
]);

export const deliveryNoteStatusEnum = pgEnum('delivery_note_status', [
  'draft',
  'dispatched',
  'delivered',
  'returned',
]);

export const quotationStatusEnum = pgEnum('quotation_status', [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
]);

// ─── Tables ─────────────────────────────────────────────

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  customerNumber: varchar('customer_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  customerType: customerTypeEnum('customer_type').default('company').notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  mobile: varchar('mobile', { length: 50 }),
  company: varchar('company', { length: 255 }),
  taxId: varchar('tax_id', { length: 100 }),
  website: varchar('website', { length: 500 }),
  billingAddress: text('billing_address'),
  billingCity: varchar('billing_city', { length: 100 }),
  billingState: varchar('billing_state', { length: 100 }),
  billingCountry: varchar('billing_country', { length: 100 }),
  billingPostalCode: varchar('billing_postal_code', { length: 20 }),
  shippingAddress: text('shipping_address'),
  shippingCity: varchar('shipping_city', { length: 100 }),
  shippingState: varchar('shipping_state', { length: 100 }),
  shippingCountry: varchar('shipping_country', { length: 100 }),
  shippingPostalCode: varchar('shipping_postal_code', { length: 20 }),
  creditLimit: decimal('credit_limit', { precision: 20, scale: 4 }).default('0').notNull(),
  outstandingBalance: decimal('outstanding_balance', { precision: 20, scale: 4 }).default('0').notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  paymentTerms: varchar('payment_terms', { length: 100 }),
  status: customerStatusEnum('status').default('active').notNull(),
  contactId: uuid('contact_id'),
  notes: text('notes'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('customers_tenant_id_idx').on(table.tenantId),
]);

export const salesOrders = pgTable('sales_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  customerId: uuid('customer_id')
    .references(() => customers.id, { onDelete: 'restrict' })
    .notNull(),
  quotationId: uuid('quotation_id'),
  orderDate: date('order_date').notNull(),
  deliveryDate: date('delivery_date'),
  status: salesOrderStatusEnum('status').default('draft').notNull(),
  subtotal: decimal('subtotal', { precision: 20, scale: 4 }).default('0').notNull(),
  taxAmount: decimal('tax_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  discountAmount: decimal('discount_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  totalAmount: decimal('total_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  notes: text('notes'),
  termsAndConditions: text('terms_and_conditions'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('sales_orders_tenant_id_idx').on(table.tenantId),
  index('sales_orders_tenant_id_status_idx').on(table.tenantId, table.status),
]);

export const salesOrderLines = pgTable('sales_order_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  salesOrderId: uuid('sales_order_id')
    .references(() => salesOrders.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 20, scale: 4 }).notNull(),
  discount: decimal('discount', { precision: 8, scale: 4 }).default('0').notNull(),
  taxRate: decimal('tax_rate', { precision: 8, scale: 4 }).default('0').notNull(),
  lineTotal: decimal('line_total', { precision: 20, scale: 4 }).notNull(),
});

export const quotations = pgTable('quotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  quotationNumber: varchar('quotation_number', { length: 50 }).notNull(),
  customerId: uuid('customer_id')
    .references(() => customers.id, { onDelete: 'restrict' })
    .notNull(),
  quotationDate: date('quotation_date').notNull(),
  validUntil: date('valid_until').notNull(),
  status: quotationStatusEnum('status').default('draft').notNull(),
  subtotal: decimal('subtotal', { precision: 20, scale: 4 }).default('0').notNull(),
  taxAmount: decimal('tax_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  discountAmount: decimal('discount_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  totalAmount: decimal('total_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  notes: text('notes'),
  termsAndConditions: text('terms_and_conditions'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const quotationLines = pgTable('quotation_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationId: uuid('quotation_id')
    .references(() => quotations.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 20, scale: 4 }).notNull(),
  discount: decimal('discount', { precision: 8, scale: 4 }).default('0').notNull(),
  taxRate: decimal('tax_rate', { precision: 8, scale: 4 }).default('0').notNull(),
  lineTotal: decimal('line_total', { precision: 20, scale: 4 }).notNull(),
});

export const deliveryNotes = pgTable('delivery_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  deliveryNumber: varchar('delivery_number', { length: 50 }).notNull(),
  salesOrderId: uuid('sales_order_id')
    .references(() => salesOrders.id, { onDelete: 'restrict' })
    .notNull(),
  customerId: uuid('customer_id')
    .references(() => customers.id, { onDelete: 'restrict' })
    .notNull(),
  deliveryDate: date('delivery_date').notNull(),
  status: deliveryNoteStatusEnum('status').default('draft').notNull(),
  carrier: varchar('carrier', { length: 255 }),
  trackingNumber: varchar('tracking_number', { length: 255 }),
  shippingAddress: text('shipping_address'),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const deliveryNoteLines = pgTable('delivery_note_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  deliveryNoteId: uuid('delivery_note_id')
    .references(() => deliveryNotes.id, { onDelete: 'cascade' })
    .notNull(),
  salesOrderLineId: uuid('sales_order_line_id')
    .references(() => salesOrderLines.id, { onDelete: 'restrict' }),
  itemId: uuid('item_id')
    .references(() => items.id, { onDelete: 'restrict' })
    .notNull(),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
});

// ─── Relations ──────────────────────────────────────────

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  assignee: one(users, {
    fields: [customers.assignedTo],
    references: [users.id],
  }),
  salesOrders: many(salesOrders),
  quotations: many(quotations),
  deliveryNotes: many(deliveryNotes),
}));

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [salesOrders.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  quotation: one(quotations, {
    fields: [salesOrders.quotationId],
    references: [quotations.id],
  }),
  creator: one(users, {
    fields: [salesOrders.createdBy],
    references: [users.id],
  }),
  lines: many(salesOrderLines),
  deliveryNotes: many(deliveryNotes),
}));

export const salesOrderLinesRelations = relations(salesOrderLines, ({ one }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderLines.salesOrderId],
    references: [salesOrders.id],
  }),
  item: one(items, {
    fields: [salesOrderLines.itemId],
    references: [items.id],
  }),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [quotations.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id],
  }),
  creator: one(users, {
    fields: [quotations.createdBy],
    references: [users.id],
  }),
  lines: many(quotationLines),
}));

export const quotationLinesRelations = relations(quotationLines, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationLines.quotationId],
    references: [quotations.id],
  }),
  item: one(items, {
    fields: [quotationLines.itemId],
    references: [items.id],
  }),
}));

export const deliveryNotesRelations = relations(deliveryNotes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [deliveryNotes.tenantId],
    references: [tenants.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [deliveryNotes.salesOrderId],
    references: [salesOrders.id],
  }),
  customer: one(customers, {
    fields: [deliveryNotes.customerId],
    references: [customers.id],
  }),
  creator: one(users, {
    fields: [deliveryNotes.createdBy],
    references: [users.id],
  }),
  lines: many(deliveryNoteLines),
}));

export const deliveryNoteLinesRelations = relations(deliveryNoteLines, ({ one }) => ({
  deliveryNote: one(deliveryNotes, {
    fields: [deliveryNoteLines.deliveryNoteId],
    references: [deliveryNotes.id],
  }),
  salesOrderLine: one(salesOrderLines, {
    fields: [deliveryNoteLines.salesOrderLineId],
    references: [salesOrderLines.id],
  }),
  item: one(items, {
    fields: [deliveryNoteLines.itemId],
    references: [items.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type SalesOrder = typeof salesOrders.$inferSelect;
export type NewSalesOrder = typeof salesOrders.$inferInsert;
export type SalesOrderLine = typeof salesOrderLines.$inferSelect;
export type NewSalesOrderLine = typeof salesOrderLines.$inferInsert;
export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;
export type QuotationLine = typeof quotationLines.$inferSelect;
export type NewQuotationLine = typeof quotationLines.$inferInsert;
export type DeliveryNote = typeof deliveryNotes.$inferSelect;
export type NewDeliveryNote = typeof deliveryNotes.$inferInsert;
export type DeliveryNoteLine = typeof deliveryNoteLines.$inferSelect;
export type NewDeliveryNoteLine = typeof deliveryNoteLines.$inferInsert;
