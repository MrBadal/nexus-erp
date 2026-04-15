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
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

// ─── Enums ──────────────────────────────────────────────────────────────────

export const contractTypeEnum = pgEnum('construction_contract_type', [
  'lump_sum',       // Fixed-price contract
  'item_rate',      // Per-unit rate contract (most common in Indian govt)
  'cost_plus',      // Cost + fixed fee
  'epc',            // Engineering, Procurement, Construction
  'turnkey',
  'labour_only',    // Labour-only contract (12% GST)
]);

export const contractStatusEnum = pgEnum('construction_contract_status', [
  'draft',
  'tendering',
  'awarded',
  'active',
  'completed',
  'terminated',
  'on_hold',
]);

export const boqItemTypeEnum = pgEnum('boq_item_type', [
  'civil',
  'structural',
  'mechanical',
  'electrical',
  'plumbing',
  'finishing',
  'external',
  'provisional_sum',
  'prime_cost',
]);

export const raBillStatusEnum = pgEnum('ra_bill_status', [
  'draft',
  'submitted',       // Submitted by contractor
  'under_review',    // Site engineer reviewing
  'certified',       // Engineer certified (triggers AR invoice)
  'approved',        // Client approved
  'paid',
  'rejected',
  'on_hold',
]);

export const workOrderTypeEnum = pgEnum('work_order_type', [
  'subcontractor',   // Subcontractor work order
  'supplier',        // Material supply order
  'labour',          // Labour supply
  'service',
]);

export const constructionWorkOrderStatusEnum = pgEnum('construction_work_order_status', [
  'draft',
  'approved',
  'active',
  'completed',
  'cancelled',
]);

export const siteGrnStatusEnum = pgEnum('site_grn_status', [
  'draft',
  'submitted',
  'approved',    // Triggers inventory stock update + accrual journal
  'rejected',
]);

export const siteMaterialRequestStatusEnum = pgEnum('site_material_request_status', [
  'draft',
  'approved',
  'issued',
  'partially_issued',
]);

export const dprStatusEnum = pgEnum('dpr_status', [
  'draft',
  'submitted',
  'approved',
]);

export const tdsRateTypeEnum = pgEnum('tds_rate_type', [
  'individual_huf',   // 1% (Section 194C)
  'company_firm',     // 2% (Section 194C)
  'professional',     // 10% (Section 194J)
]);

// ─── Construction Contracts ─────────────────────────────────────────────────

export const constructionContracts = pgTable('construction_contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  contractNumber: varchar('contract_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientGstin: varchar('client_gstin', { length: 20 }),
  contractType: contractTypeEnum('contract_type').default('item_rate').notNull(),
  status: contractStatusEnum('status').default('draft').notNull(),

  // Financials
  contractValue: decimal('contract_value', { precision: 20, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 6, scale: 2 }).default('12').notNull(), // 12% works contract
  retentionPercentage: decimal('retention_percentage', { precision: 6, scale: 2 }).default('5').notNull(),
  mobilisationAdvance: decimal('mobilisation_advance', { precision: 20, scale: 2 }).default('0').notNull(),
  advanceRecoveryPercent: decimal('advance_recovery_percent', { precision: 5, scale: 2 }).default('10.00').notNull(),

  // Dates
  startDate: date('start_date'),
  endDate: date('end_date'),
  revisedEndDate: date('revised_end_date'),

  // Location
  projectLocation: varchar('project_location', { length: 500 }),
  state: varchar('state', { length: 100 }),

  // Compliance
  isReraApplicable: boolean('is_rera_applicable').default(false).notNull(),
  reraNumber: varchar('rera_number', { length: 100 }),
  isBocwApplicable: boolean('is_bocw_applicable').default(true).notNull(), // BOCW cess 1%

  // Progress tracking
  totalBilled: decimal('total_billed', { precision: 20, scale: 2 }).default('0').notNull(),
  totalReceived: decimal('total_received', { precision: 20, scale: 2 }).default('0').notNull(),
  retentionHeld: decimal('retention_held', { precision: 20, scale: 2 }).default('0').notNull(),
  completionPercentage: decimal('completion_percentage', { precision: 6, scale: 2 }).default('0').notNull(),

  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── Bill of Quantities (BOQ) ────────────────────────────────────────────────

export const boqItems = pgTable('boq_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  contractId: uuid('contract_id')
    .references(() => constructionContracts.id, { onDelete: 'cascade' })
    .notNull(),
  itemCode: varchar('item_code', { length: 50 }).notNull(),
  description: text('description').notNull(),
  itemType: boqItemTypeEnum('item_type').default('civil').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(), // cum, sqm, rmt, nos, kg, etc.
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
  rate: decimal('rate', { precision: 20, scale: 4 }).notNull(),
  amount: decimal('amount', { precision: 20, scale: 2 }).notNull(),
  quantityExecuted: decimal('quantity_executed', { precision: 20, scale: 4 }).default('0').notNull(),
  amountBilled: decimal('amount_billed', { precision: 20, scale: 2 }).default('0').notNull(),
  parentId: uuid('parent_id'), // for hierarchical BOQ (chapter > section > item)
  sortOrder: integer('sort_order').default(0).notNull(),
  isProvisional: boolean('is_provisional').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── Measurement Books ───────────────────────────────────────────────────────

export const measurementBooks = pgTable('measurement_books', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  contractId: uuid('contract_id')
    .references(() => constructionContracts.id, { onDelete: 'cascade' })
    .notNull(),
  mbNumber: varchar('mb_number', { length: 50 }).notNull(),
  measurementDate: date('measurement_date').notNull(),
  measuredBy: varchar('measured_by', { length: 255 }),
  checkedBy: varchar('checked_by', { length: 255 }),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const measurementBookLines = pgTable('measurement_book_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  mbId: uuid('mb_id')
    .references(() => measurementBooks.id, { onDelete: 'cascade' })
    .notNull(),
  boqItemId: uuid('boq_item_id')
    .references(() => boqItems.id, { onDelete: 'restrict' })
    .notNull(),
  description: text('description'),
  // Measurement details (Length × Breadth × Height / Depth)
  noOfItems: decimal('no_of_items', { precision: 10, scale: 2 }).default('1'),
  length: decimal('length', { precision: 12, scale: 4 }),
  breadth: decimal('breadth', { precision: 12, scale: 4 }),
  height: decimal('height', { precision: 12, scale: 4 }),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).notNull(),
  rate: decimal('rate', { precision: 20, scale: 4 }).notNull(),
  amount: decimal('amount', { precision: 20, scale: 2 }).notNull(),
});

// ─── RA Bills (Running Account Bills) ──────────────────────────────────────

export const raBills = pgTable('ra_bills', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  contractId: uuid('contract_id')
    .references(() => constructionContracts.id, { onDelete: 'cascade' })
    .notNull(),
  billNumber: varchar('bill_number', { length: 50 }).notNull(),
  billDate: date('bill_date').notNull(),
  status: raBillStatusEnum('status').default('draft').notNull(),
  billSequence: integer('bill_sequence').default(1).notNull(), // RA-1, RA-2, ...

  // Billing amounts (cumulative method: this bill = cumulative - previous bills)
  grossAmount: decimal('gross_amount', { precision: 20, scale: 2 }).notNull(),
  previousBilledAmount: decimal('previous_billed_amount', { precision: 20, scale: 2 }).default('0').notNull(),
  currentBillAmount: decimal('current_bill_amount', { precision: 20, scale: 2 }).notNull(),

  // Deductions
  retentionAmount: decimal('retention_amount', { precision: 20, scale: 2 }).default('0').notNull(),
  mobilisationRecovery: decimal('mobilisation_recovery', { precision: 20, scale: 2 }).default('0').notNull(),
  advanceAdjusted: decimal('advance_adjusted', { precision: 20, scale: 4 }).default('0').notNull(),
  otherDeductions: decimal('other_deductions', { precision: 20, scale: 2 }).default('0').notNull(),

  // Tax
  gstAmount: decimal('gst_amount', { precision: 20, scale: 2 }).default('0').notNull(),
  gstRate: decimal('gst_rate', { precision: 6, scale: 2 }).default('12').notNull(),

  // Net payable
  netPayable: decimal('net_payable', { precision: 20, scale: 2 }).notNull(),

  // Measurement period
  measurementPeriodFrom: date('measurement_period_from'),
  measurementPeriodTo: date('measurement_period_to'),

  // Finance integration
  journalEntryId: uuid('journal_entry_id'),
  arInvoiceId: uuid('ar_invoice_id'),

  certifiedBy: varchar('certified_by', { length: 255 }),
  certifiedAt: timestamp('certified_at', { withTimezone: true }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),

  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const raBillLines = pgTable('ra_bill_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  raBillId: uuid('ra_bill_id')
    .references(() => raBills.id, { onDelete: 'cascade' })
    .notNull(),
  boqItemId: uuid('boq_item_id')
    .references(() => boqItems.id, { onDelete: 'restrict' })
    .notNull(),
  mbId: uuid('mb_id').references(() => measurementBooks.id, { onDelete: 'set null' }),
  description: text('description'),
  unit: varchar('unit', { length: 50 }).notNull(),
  totalQuantity: decimal('total_quantity', { precision: 20, scale: 4 }).notNull(),   // Cumulative to date
  previousQuantity: decimal('previous_quantity', { precision: 20, scale: 4 }).default('0').notNull(),
  currentQuantity: decimal('current_quantity', { precision: 20, scale: 4 }).notNull(), // This bill qty
  rate: decimal('rate', { precision: 20, scale: 4 }).notNull(),
  amount: decimal('amount', { precision: 20, scale: 2 }).notNull(), // currentQuantity × rate
});

// ─── Work Orders (Subcontractor / Supplier) ──────────────────────────────────

export const constructionWorkOrders = pgTable('construction_work_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  contractId: uuid('contract_id')
    .references(() => constructionContracts.id, { onDelete: 'cascade' })
    .notNull(),
  workOrderNumber: varchar('work_order_number', { length: 50 }).notNull(),
  type: workOrderTypeEnum('type').default('subcontractor').notNull(),
  status: constructionWorkOrderStatusEnum('status').default('draft').notNull(),

  // Subcontractor / supplier details
  vendorName: varchar('vendor_name', { length: 255 }).notNull(),
  vendorGstin: varchar('vendor_gstin', { length: 20 }),
  vendorPan: varchar('vendor_pan', { length: 15 }), // For TDS
  vendorType: tdsRateTypeEnum('vendor_type').default('company_firm').notNull(),

  // Scope
  scopeOfWork: text('scope_of_work').notNull(),
  workLocation: varchar('work_location', { length: 500 }),

  // Financials
  orderValue: decimal('order_value', { precision: 20, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 6, scale: 2 }).default('12').notNull(),
  retentionPercentage: decimal('retention_percentage', { precision: 6, scale: 2 }).default('5').notNull(),

  // TDS (Section 194C)
  tdsApplicable: boolean('tds_applicable').default(true).notNull(),
  tdsRate: decimal('tds_rate', { precision: 6, scale: 2 }).default('2').notNull(), // 2% companies, 1% individuals
  tdsSection: varchar('tds_section', { length: 20 }).default('194C').notNull(),

  // Progress
  totalPaid: decimal('total_paid', { precision: 20, scale: 2 }).default('0').notNull(),
  tdsDeducted: decimal('tds_deducted', { precision: 20, scale: 2 }).default('0').notNull(),
  retentionHeld: decimal('retention_held', { precision: 20, scale: 2 }).default('0').notNull(),

  startDate: date('start_date'),
  endDate: date('end_date'),

  notes: text('notes'),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const workOrderLines = pgTable('work_order_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  workOrderId: uuid('work_order_id')
    .references(() => constructionWorkOrders.id, { onDelete: 'cascade' })
    .notNull(),
  boqItemId: uuid('boq_item_id').references(() => boqItems.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  unit: varchar('unit', { length: 50 }),
  quantity: decimal('quantity', { precision: 20, scale: 4 }),
  rate: decimal('rate', { precision: 20, scale: 4 }),
  amount: decimal('amount', { precision: 20, scale: 2 }).notNull(),
  lineNumber: integer('line_number').default(1).notNull(),
});

// ─── Work Order Payments ─────────────────────────────────────────────────────

export const workOrderPayments = pgTable('work_order_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  workOrderId: uuid('work_order_id')
    .references(() => constructionWorkOrders.id, { onDelete: 'cascade' })
    .notNull(),
  paymentNumber: varchar('payment_number', { length: 50 }).notNull(),
  paymentDate: date('payment_date').notNull(),
  grossAmount: decimal('gross_amount', { precision: 20, scale: 2 }).notNull(),
  gstAmount: decimal('gst_amount', { precision: 20, scale: 2 }).default('0').notNull(),
  tdsAmount: decimal('tds_amount', { precision: 20, scale: 2 }).default('0').notNull(),
  retentionAmount: decimal('retention_amount', { precision: 20, scale: 2 }).default('0').notNull(),
  netPayable: decimal('net_payable', { precision: 20, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('draft').notNull(), // draft, approved, paid
  journalEntryId: uuid('journal_entry_id'),
  notes: text('notes'),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Site Goods Receipt Notes (Site GRN) ────────────────────────────────────

export const siteGrns = pgTable('site_grns', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  contractId: uuid('contract_id')
    .references(() => constructionContracts.id, { onDelete: 'cascade' })
    .notNull(),
  grnNumber: varchar('grn_number', { length: 50 }).notNull(),
  grnDate: date('grn_date').notNull(),
  status: siteGrnStatusEnum('status').default('draft').notNull(),
  workOrderId: uuid('work_order_id').references(() => constructionWorkOrders.id, { onDelete: 'set null' }),
  supplierName: varchar('supplier_name', { length: 255 }),
  vehicleNumber: varchar('vehicle_number', { length: 30 }),
  challanNumber: varchar('challan_number', { length: 100 }),
  warehouseId: uuid('warehouse_id'), // site warehouse
  totalValue: decimal('total_value', { precision: 20, scale: 2 }).default('0').notNull(),
  journalEntryId: uuid('journal_entry_id'),
  receivedBy: uuid('received_by').references(() => users.id, { onDelete: 'set null' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const siteGrnLines = pgTable('site_grn_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteGrnId: uuid('site_grn_id')
    .references(() => siteGrns.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id').notNull(), // references inventory items
  itemDescription: varchar('item_description', { length: 500 }),
  unit: varchar('unit', { length: 50 }).notNull(),
  quantityOrdered: decimal('quantity_ordered', { precision: 20, scale: 4 }),
  quantityReceived: decimal('quantity_received', { precision: 20, scale: 4 }).notNull(),
  quantityRejected: decimal('quantity_rejected', { precision: 20, scale: 4 }).default('0').notNull(),
  unitRate: decimal('unit_rate', { precision: 20, scale: 4 }).notNull(),
  amount: decimal('amount', { precision: 20, scale: 2 }).notNull(),
  boqItemId: uuid('boq_item_id').references(() => boqItems.id, { onDelete: 'set null' }),
});

// ─── Site Material Issues ────────────────────────────────────────────────────

export const siteMaterialIssues = pgTable('site_material_issues', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  contractId: uuid('contract_id')
    .references(() => constructionContracts.id, { onDelete: 'cascade' })
    .notNull(),
  issueNumber: varchar('issue_number', { length: 50 }).notNull(),
  issueDate: date('issue_date').notNull(),
  status: siteMaterialRequestStatusEnum('status').default('draft').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  issuedTo: varchar('issued_to', { length: 255 }), // subcontractor or team
  boqItemId: uuid('boq_item_id').references(() => boqItems.id, { onDelete: 'set null' }), // cost allocation
  totalValue: decimal('total_value', { precision: 20, scale: 2 }).default('0').notNull(),
  journalEntryId: uuid('journal_entry_id'),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const siteMaterialIssueLines = pgTable('site_material_issue_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id')
    .references(() => siteMaterialIssues.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id').notNull(),
  itemDescription: varchar('item_description', { length: 500 }),
  unit: varchar('unit', { length: 50 }).notNull(),
  quantityIssued: decimal('quantity_issued', { precision: 20, scale: 4 }).notNull(),
  unitRate: decimal('unit_rate', { precision: 20, scale: 4 }).notNull(),
  amount: decimal('amount', { precision: 20, scale: 2 }).notNull(),
});

// ─── Daily Progress Reports (DPR) ───────────────────────────────────────────

export const dprs = pgTable('dprs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  contractId: uuid('contract_id')
    .references(() => constructionContracts.id, { onDelete: 'cascade' })
    .notNull(),
  dprNumber: varchar('dpr_number', { length: 50 }).notNull(),
  reportDate: date('report_date').notNull(),
  status: dprStatusEnum('status').default('draft').notNull(),
  weather: varchar('weather', { length: 100 }),
  temperature: varchar('temperature', { length: 20 }),

  // Labour summary
  skilledLabour: integer('skilled_labour').default(0).notNull(),
  unskilledLabour: integer('unskilled_labour').default(0).notNull(),
  supervisors: integer('supervisors').default(0).notNull(),
  engineers: integer('engineers').default(0).notNull(),

  // Equipment summary
  equipmentDetails: jsonb('equipment_details'),

  // Progress notes
  workDoneToday: text('work_done_today'),
  issuesObserved: text('issues_observed'),
  nextDayPlan: text('next_day_plan'),
  visitorsOnSite: text('visitors_on_site'),

  submittedBy: uuid('submitted_by').references(() => users.id, { onDelete: 'set null' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dprWorkItems = pgTable('dpr_work_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  dprId: uuid('dpr_id')
    .references(() => dprs.id, { onDelete: 'cascade' })
    .notNull(),
  boqItemId: uuid('boq_item_id').references(() => boqItems.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  quantityToday: decimal('quantity_today', { precision: 20, scale: 4 }).notNull(),
  cumulativeQuantity: decimal('cumulative_quantity', { precision: 20, scale: 4 }).notNull(),
  remarks: text('remarks'),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const constructionContractsRelations = relations(
  constructionContracts,
  ({ one, many }) => ({
    tenant: one(tenants, { fields: [constructionContracts.tenantId], references: [tenants.id] }),
    creator: one(users, { fields: [constructionContracts.createdBy], references: [users.id] }),
    boqItems: many(boqItems),
    raBills: many(raBills),
    workOrders: many(constructionWorkOrders),
    siteGrns: many(siteGrns),
    siteMaterialIssues: many(siteMaterialIssues),
    dprs: many(dprs),
  }),
);

export const boqItemsRelations = relations(boqItems, ({ one, many }) => ({
  contract: one(constructionContracts, { fields: [boqItems.contractId], references: [constructionContracts.id] }),
  parent: one(boqItems, { fields: [boqItems.parentId], references: [boqItems.id], relationName: 'boqParentChild' }),
  children: many(boqItems, { relationName: 'boqParentChild' }),
  raBillLines: many(raBillLines),
  mbLines: many(measurementBookLines),
}));

export const raBillsRelations = relations(raBills, ({ one, many }) => ({
  contract: one(constructionContracts, { fields: [raBills.contractId], references: [constructionContracts.id] }),
  approver: one(users, { fields: [raBills.approvedBy], references: [users.id] }),
  lines: many(raBillLines),
}));

export const constructionWorkOrdersRelations = relations(constructionWorkOrders, ({ one, many }) => ({
  contract: one(constructionContracts, { fields: [constructionWorkOrders.contractId], references: [constructionContracts.id] }),
  approver: one(users, { fields: [constructionWorkOrders.approvedBy], references: [users.id] }),
  lines: many(workOrderLines),
  payments: many(workOrderPayments),
}));

export const siteGrnsRelations = relations(siteGrns, ({ one, many }) => ({
  contract: one(constructionContracts, { fields: [siteGrns.contractId], references: [constructionContracts.id] }),
  workOrder: one(constructionWorkOrders, { fields: [siteGrns.workOrderId], references: [constructionWorkOrders.id] }),
  lines: many(siteGrnLines),
}));

// ─── Type Exports ────────────────────────────────────────────────────────────

export type ConstructionContract = typeof constructionContracts.$inferSelect;
export type NewConstructionContract = typeof constructionContracts.$inferInsert;
export type BoqItem = typeof boqItems.$inferSelect;
export type NewBoqItem = typeof boqItems.$inferInsert;
export type MeasurementBook = typeof measurementBooks.$inferSelect;
export type NewMeasurementBook = typeof measurementBooks.$inferInsert;
export type RaBill = typeof raBills.$inferSelect;
export type NewRaBill = typeof raBills.$inferInsert;
export type RaBillLine = typeof raBillLines.$inferSelect;
export type NewRaBillLine = typeof raBillLines.$inferInsert;
export type ConstructionWorkOrder = typeof constructionWorkOrders.$inferSelect;
export type NewConstructionWorkOrder = typeof constructionWorkOrders.$inferInsert;
export type WorkOrderPayment = typeof workOrderPayments.$inferSelect;
export type NewWorkOrderPayment = typeof workOrderPayments.$inferInsert;
export type SiteGrn = typeof siteGrns.$inferSelect;
export type NewSiteGrn = typeof siteGrns.$inferInsert;
export type SiteGrnLine = typeof siteGrnLines.$inferSelect;
export type NewSiteGrnLine = typeof siteGrnLines.$inferInsert;
export type SiteMaterialIssue = typeof siteMaterialIssues.$inferSelect;
export type NewSiteMaterialIssue = typeof siteMaterialIssues.$inferInsert;
export type Dpr = typeof dprs.$inferSelect;
export type NewDpr = typeof dprs.$inferInsert;
