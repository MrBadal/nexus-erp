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
  bigserial,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

// ─── Enums ──────────────────────────────────────────────

export const accountTypeEnum = pgEnum('account_type', [
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
  'contra_asset',
  'contra_liability',
  'contra_equity',
  'contra_revenue',
  'contra_expense',
]);

export const normalBalanceEnum = pgEnum('normal_balance', ['debit', 'credit']);

export const financialStatementEnum = pgEnum('financial_statement', [
  'balance_sheet',
  'income_statement',
]);

export const journalSourceTypeEnum = pgEnum('journal_source_type', [
  'manual',
  'invoice',
  'bill',
  'payment',
  'bank_reconciliation',
  'adjustment',
  'closing',
  'opening',
]);

export const journalStatusEnum = pgEnum('journal_status', [
  'draft',
  'posted',
  'reversed',
]);

export const invoiceTypeEnum = pgEnum('invoice_type', [
  'standard',
  'credit_note',
  'debit_note',
  'proforma',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
  'void',
]);

export const paymentTermsEnum = pgEnum('payment_terms', [
  'due_on_receipt',
  'net_7',
  'net_10',
  'net_15',
  'net_30',
  'net_45',
  'net_60',
  'net_90',
  'custom',
]);

export const discountTypeEnum = pgEnum('discount_type', [
  'percentage',
  'fixed',
]);

export const fiscalPeriodTypeEnum = pgEnum('fiscal_period_type', [
  'month',
  'quarter',
  'year',
]);

export const fiscalPeriodStatusEnum = pgEnum('fiscal_period_status', [
  'open',
  'closed',
  'locked',
]);

export const taxTypeEnum = pgEnum('tax_type', ['percentage', 'fixed']);

export const taxScopeEnum = pgEnum('tax_scope', [
  'sales',
  'purchase',
  'both',
]);

export const exchangeRateSourceEnum = pgEnum('exchange_rate_source', [
  'manual',
  'api',
  'central_bank',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'bank_transfer',
  'check',
  'credit_card',
  'debit_card',
  'online',
  'mobile_money',
  'other',
]);

export const paymentTypeEnum = pgEnum('payment_type', ['received', 'made']);

export const paymentStatusEnum = pgEnum('payment_status', [
  'draft',
  'confirmed',
  'reconciled',
  'void',
]);

export const billStatusEnum = pgEnum('bill_status', [
  'draft',
  'received',
  'approved',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
  'void',
]);

export const threeWayMatchStatusEnum = pgEnum('three_way_match_status', [
  'pending',
  'partial_match',
  'matched',
  'mismatch',
  'not_applicable',
]);

export const bankTransactionTypeEnum = pgEnum('bank_transaction_type', [
  'deposit',
  'withdrawal',
  'transfer',
  'fee',
  'interest',
  'adjustment',
]);

export const bankTransactionStatusEnum = pgEnum('bank_transaction_status', [
  'unmatched',
  'matched',
  'reconciled',
  'excluded',
]);

export const bankMatchedByEnum = pgEnum('bank_matched_by', [
  'manual',
  'auto',
  'ai',
]);

export const bankImportSourceEnum = pgEnum('bank_import_source', [
  'csv',
  'ofx',
  'plaid',
  'manual',
]);

export const tdsThresholdPeriodEnum = pgEnum('tds_threshold_period', ['annual', 'per_transaction']);
export const tdsDeductionStatusEnum = pgEnum('tds_deduction_status', ['pending', 'deducted', 'deposited']);

// ─── Tables ─────────────────────────────────────────────

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  accountType: accountTypeEnum('account_type').notNull(),
  parentId: uuid('parent_id'),
  currencyCode: varchar('currency_code', { length: 3 }).default('INR').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  isHeader: boolean('is_header').default(false).notNull(),
  isSystem: boolean('is_system').default(false).notNull(),
  taxRateId: uuid('tax_rate_id'),
  departmentId: uuid('department_id'),
  openingBalance: decimal('opening_balance', { precision: 20, scale: 4 }).default('0').notNull(),
  currentBalance: decimal('current_balance', { precision: 20, scale: 4 }).default('0').notNull(),
  normalBalance: normalBalanceEnum('normal_balance').notNull(),
  financialStatement: financialStatementEnum('financial_statement').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('accounts_tenant_id_idx').on(table.tenantId),
  index('accounts_tenant_type_idx').on(table.tenantId, table.accountType),
  index('accounts_tenant_code_idx').on(table.tenantId, table.code),
]);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [accounts.tenantId],
    references: [tenants.id],
  }),
  parent: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
    relationName: 'parentChild',
  }),
  children: many(accounts, { relationName: 'parentChild' }),
  taxRate: one(taxRates, {
    fields: [accounts.taxRateId],
    references: [taxRates.id],
  }),
  journalLines: many(journalLines),
}));

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  entryNumber: varchar('entry_number', { length: 50 }).notNull(),
  date: date('date').notNull(),
  postedDate: date('posted_date'),
  reference: varchar('reference', { length: 255 }),
  description: text('description'),
  sourceType: journalSourceTypeEnum('source_type').default('manual').notNull(),
  sourceId: uuid('source_id'),
  status: journalStatusEnum('status').default('draft').notNull(),
  isReversing: boolean('is_reversing').default(false).notNull(),
  reversedById: uuid('reversed_by_id'),
  reversesId: uuid('reverses_id'),
  fiscalPeriodId: uuid('fiscal_period_id'),
  currencyCode: varchar('currency_code', { length: 3 }).default('INR').notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 20, scale: 8 }).default('1').notNull(),
  totalDebit: decimal('total_debit', { precision: 20, scale: 4 }).default('0').notNull(),
  totalCredit: decimal('total_credit', { precision: 20, scale: 4 }).default('0').notNull(),
  attachments: text('attachments').array(),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  tags: text('tags').array(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('journal_entries_tenant_id_idx').on(table.tenantId),
  index('journal_entries_tenant_status_idx').on(table.tenantId, table.status),
  index('journal_entries_tenant_date_idx').on(table.tenantId, table.date),
]);

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [journalEntries.tenantId],
    references: [tenants.id],
  }),
  lines: many(journalLines),
  fiscalPeriod: one(fiscalPeriods, {
    fields: [journalEntries.fiscalPeriodId],
    references: [fiscalPeriods.id],
  }),
  creator: one(users, {
    fields: [journalEntries.createdBy],
    references: [users.id],
  }),
}));

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  journalEntryId: uuid('journal_entry_id')
    .references(() => journalEntries.id, { onDelete: 'cascade' })
    .notNull(),
  lineNumber: integer('line_number').notNull(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'restrict' })
    .notNull(),
  description: text('description'),
  debitAmount: decimal('debit_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  creditAmount: decimal('credit_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  baseDebitAmount: decimal('base_debit_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  baseCreditAmount: decimal('base_credit_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  departmentId: uuid('department_id'),
  projectId: uuid('project_id'),
  contactId: uuid('contact_id'),
  taxRateId: uuid('tax_rate_id'),
  taxAmount: decimal('tax_amount', { precision: 20, scale: 4 }),
  reconciled: boolean('reconciled').default(false).notNull(),
  reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
}, (table) => [
  index('journal_lines_tenant_id_idx').on(table.tenantId),
  index('journal_lines_entry_id_idx').on(table.journalEntryId),
  index('journal_lines_account_id_idx').on(table.accountId),
  index('journal_lines_tenant_account_idx').on(table.tenantId, table.accountId),
]);

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalLines.accountId],
    references: [accounts.id],
  }),
}));

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  type: invoiceTypeEnum('type').default('standard').notNull(),
  status: invoiceStatusEnum('status').default('draft').notNull(),
  customerId: uuid('customer_id'),
  billingAddress: jsonb('billing_address'),
  shippingAddress: jsonb('shipping_address'),
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  paymentTerms: paymentTermsEnum('payment_terms').default('net_30'),
  currencyCode: varchar('currency_code', { length: 3 }).default('INR').notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 20, scale: 8 }).default('1').notNull(),
  subtotal: decimal('subtotal', { precision: 20, scale: 4 }).default('0').notNull(),
  discountType: discountTypeEnum('discount_type'),
  discountValue: decimal('discount_value', { precision: 20, scale: 4 }),
  discountAmount: decimal('discount_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  taxAmount: decimal('tax_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  total: decimal('total', { precision: 20, scale: 4 }).default('0').notNull(),
  amountPaid: decimal('amount_paid', { precision: 20, scale: 4 }).default('0').notNull(),
  balanceDue: decimal('balance_due', { precision: 20, scale: 4 }).default('0').notNull(),
  notes: text('notes'),
  customerNotes: text('customer_notes'),
  termsAndConditions: text('terms_and_conditions'),
  footer: text('footer'),
  recurring: boolean('recurring').default(false).notNull(),
  journalEntryId: uuid('journal_entry_id'),
  creditNoteForId: uuid('credit_note_for_id'),
  salesOrderId: uuid('sales_order_id'),
  projectId: uuid('project_id'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('invoices_tenant_id_idx').on(table.tenantId),
  index('invoices_tenant_status_idx').on(table.tenantId, table.status),
  index('invoices_tenant_due_date_idx').on(table.tenantId, table.dueDate),
  index('invoices_customer_id_idx').on(table.customerId),
]);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  lines: many(invoiceLines),
  journalEntry: one(journalEntries, {
    fields: [invoices.journalEntryId],
    references: [journalEntries.id],
  }),
  creator: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
}));

export const invoiceLines = pgTable('invoice_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  invoiceId: uuid('invoice_id')
    .references(() => invoices.id, { onDelete: 'cascade' })
    .notNull(),
  lineNumber: integer('line_number').notNull(),
  productId: uuid('product_id'),
  description: text('description'),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).default('1').notNull(),
  unitPrice: decimal('unit_price', { precision: 20, scale: 4 }).default('0').notNull(),
  unitOfMeasure: varchar('unit_of_measure', { length: 50 }),
  discountType: discountTypeEnum('discount_type'),
  discountValue: decimal('discount_value', { precision: 20, scale: 4 }),
  discountAmount: decimal('discount_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  amount: decimal('amount', { precision: 20, scale: 4 }).default('0').notNull(),
  taxRateId: uuid('tax_rate_id'),
  taxAmount: decimal('tax_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  hsnCode: varchar('hsn_code', { length: 20 }),
  cgstRate: decimal('cgst_rate', { precision: 8, scale: 4 }).default('0').notNull(),
  sgstRate: decimal('sgst_rate', { precision: 8, scale: 4 }).default('0').notNull(),
  igstRate: decimal('igst_rate', { precision: 8, scale: 4 }).default('0').notNull(),
  cgstAmount: decimal('cgst_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  sgstAmount: decimal('sgst_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  igstAmount: decimal('igst_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLines.invoiceId],
    references: [invoices.id],
  }),
  account: one(accounts, {
    fields: [invoiceLines.accountId],
    references: [accounts.id],
  }),
  taxRate: one(taxRates, {
    fields: [invoiceLines.taxRateId],
    references: [taxRates.id],
  }),
}));

export const fiscalPeriods = pgTable('fiscal_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  type: fiscalPeriodTypeEnum('type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: fiscalPeriodStatusEnum('status').default('open').notNull(),
  closedBy: uuid('closed_by').references(() => users.id, { onDelete: 'set null' }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  yearEndClosingDone: boolean('year_end_closing_done').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const taxRates = pgTable('tax_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  rate: decimal('rate', { precision: 8, scale: 4 }).notNull(),
  type: taxTypeEnum('type').default('percentage').notNull(),
  scope: taxScopeEnum('scope').default('both').notNull(),
  isCompound: boolean('is_compound').default(false).notNull(),
  isInclusive: boolean('is_inclusive').default(false).notNull(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  reportingCode: varchar('reporting_code', { length: 50 }),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const currencies = pgTable('currencies', {
  code: varchar('code', { length: 3 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  decimalPlaces: integer('decimal_places').default(2).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const exchangeRates = pgTable('exchange_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  fromCurrency: varchar('from_currency', { length: 3 }).notNull(),
  toCurrency: varchar('to_currency', { length: 3 }).notNull(),
  rate: decimal('rate', { precision: 20, scale: 8 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  source: exchangeRateSourceEnum('source').default('manual').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  paymentNumber: varchar('payment_number', { length: 50 }).notNull(),
  date: date('date').notNull(),
  amount: decimal('amount', { precision: 20, scale: 4 }).notNull(),
  currencyCode: varchar('currency_code', { length: 3 }).default('INR').notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 20, scale: 8 }).default('1').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  reference: varchar('reference', { length: 255 }),
  bankAccountId: uuid('bank_account_id'),
  customerId: uuid('customer_id'),
  vendorId: uuid('vendor_id'),
  type: paymentTypeEnum('type').notNull(),
  status: paymentStatusEnum('status').default('draft').notNull(),
  journalEntryId: uuid('journal_entry_id'),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('payments_tenant_id_idx').on(table.tenantId),
  index('payments_tenant_status_idx').on(table.tenantId, table.status),
  index('payments_tenant_date_idx').on(table.tenantId, table.date),
]);

export const bills = pgTable('bills', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  billNumber: varchar('bill_number', { length: 50 }).notNull(),
  vendorId: uuid('vendor_id'),
  vendorInvoiceNumber: varchar('vendor_invoice_number', { length: 100 }),
  status: billStatusEnum('status').default('draft').notNull(),
  purchaseOrderId: uuid('purchase_order_id'),
  issueDate: date('issue_date').notNull(),
  receivedDate: date('received_date'),
  dueDate: date('due_date').notNull(),
  paymentTerms: paymentTermsEnum('payment_terms').default('net_30'),
  currencyCode: varchar('currency_code', { length: 3 }).default('INR').notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 20, scale: 8 }).default('1').notNull(),
  subtotal: decimal('subtotal', { precision: 20, scale: 4 }).default('0').notNull(),
  taxAmount: decimal('tax_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  total: decimal('total', { precision: 20, scale: 4 }).default('0').notNull(),
  amountPaid: decimal('amount_paid', { precision: 20, scale: 4 }).default('0').notNull(),
  balanceDue: decimal('balance_due', { precision: 20, scale: 4 }).default('0').notNull(),
  threeWayMatchStatus: threeWayMatchStatusEnum('three_way_match_status').default('not_applicable'),
  journalEntryId: uuid('journal_entry_id'),
  notes: text('notes'),
  attachments: text('attachments').array(),
  aiExtracted: boolean('ai_extracted').default(false).notNull(),
  aiConfidence: decimal('ai_confidence', { precision: 5, scale: 4 }),
  tdsSectionId: uuid('tds_section_id'),
  tdsRate: decimal('tds_rate', { precision: 8, scale: 4 }),
  tdsAmount: decimal('tds_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  rcmApplicable: boolean('rcm_applicable').default(false).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── Bill Lines ────────────────────────────────────────────────────────────────

export const billLines = pgTable('bill_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  billId: uuid('bill_id')
    .references(() => bills.id, { onDelete: 'cascade' })
    .notNull(),
  lineNumber: integer('line_number').notNull(),
  itemId: uuid('item_id'),
  purchaseOrderLineId: uuid('purchase_order_line_id'),
  description: text('description'),
  quantity: decimal('quantity', { precision: 20, scale: 4 }).default('1').notNull(),
  unitPrice: decimal('unit_price', { precision: 20, scale: 4 }).default('0').notNull(),
  discountType: discountTypeEnum('discount_type'),
  discountValue: decimal('discount_value', { precision: 20, scale: 4 }).default('0'),
  taxAmount: decimal('tax_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  lineTotal: decimal('line_total', { precision: 20, scale: 4 }).default('0').notNull(),
  accountId: uuid('account_id'),
  hsnCode: varchar('hsn_code', { length: 20 }),
  cgstRate: decimal('cgst_rate', { precision: 8, scale: 4 }).default('0'),
  sgstRate: decimal('sgst_rate', { precision: 8, scale: 4 }).default('0'),
  igstRate: decimal('igst_rate', { precision: 8, scale: 4 }).default('0'),
  cgstAmount: decimal('cgst_amount', { precision: 20, scale: 4 }).default('0'),
  sgstAmount: decimal('sgst_amount', { precision: 20, scale: 4 }).default('0'),
  igstAmount: decimal('igst_amount', { precision: 20, scale: 4 }).default('0'),
  rcmApplicable: boolean('rcm_applicable').default(false).notNull(),
  itcEligible: boolean('itc_eligible').default(true).notNull(),
  itcBlockReason: varchar('itc_block_reason', { length: 255 }),
});

export type BillLine = typeof billLines.$inferSelect;
export type NewBillLine = typeof billLines.$inferInsert;

export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'restrict' })
    .notNull(),
  bankName: varchar('bank_name', { length: 255 }),
  accountNumberLast4: varchar('account_number_last4', { length: 4 }),
  currencyCode: varchar('currency_code', { length: 3 }).default('INR').notNull(),
  currentBalance: decimal('current_balance', { precision: 20, scale: 4 }).default('0').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const bankTransactions = pgTable('bank_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  bankAccountId: uuid('bank_account_id')
    .references(() => bankAccounts.id, { onDelete: 'cascade' })
    .notNull(),
  date: date('date').notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 20, scale: 4 }).notNull(),
  runningBalance: decimal('running_balance', { precision: 20, scale: 4 }),
  reference: varchar('reference', { length: 255 }),
  type: bankTransactionTypeEnum('type').notNull(),
  status: bankTransactionStatusEnum('status').default('unmatched').notNull(),
  matchedJournalLineId: uuid('matched_journal_line_id').references(() => journalLines.id, {
    onDelete: 'set null',
  }),
  matchedBy: bankMatchedByEnum('matched_by'),
  importSource: bankImportSourceEnum('import_source').default('manual').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Payment Allocations ──────────────────────────────────────────────────────

export const paymentAllocationDocTypeEnum = pgEnum('payment_allocation_doc_type', [
  'invoice',
  'bill',
  'credit_note',
  'debit_note',
]);

export const paymentAllocations = pgTable('payment_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  paymentId: uuid('payment_id')
    .references(() => payments.id, { onDelete: 'cascade' })
    .notNull(),
  documentType: paymentAllocationDocTypeEnum('document_type').notNull(),
  documentId: uuid('document_id').notNull(),
  amount: decimal('amount', { precision: 20, scale: 4 }).notNull(),
  allocatedAt: timestamp('allocated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
});

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [paymentAllocations.tenantId],
    references: [tenants.id],
  }),
  payment: one(payments, {
    fields: [paymentAllocations.paymentId],
    references: [payments.id],
  }),
}));

// ─── Budgets ───────────────────────────────────────────

export const budgetStatusEnum = pgEnum('budget_status', [
  'draft',
  'active',
  'closed',
]);

export const budgets = pgTable('budgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  fiscalYear: varchar('fiscal_year', { length: 10 }).notNull(),
  fromDate: date('from_date').notNull(),
  toDate: date('to_date').notNull(),
  status: budgetStatusEnum('status').default('draft').notNull(),
  totalBudgeted: decimal('total_budgeted', { precision: 20, scale: 4 }).default('0').notNull(),
  totalActual: decimal('total_actual', { precision: 20, scale: 4 }).default('0').notNull(),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [budgets.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [budgets.createdBy],
    references: [users.id],
  }),
  lines: many(budgetLines),
}));

export const budgetLines = pgTable('budget_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  budgetId: uuid('budget_id')
    .references(() => budgets.id, { onDelete: 'cascade' })
    .notNull(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'restrict' })
    .notNull(),
  budgetedAmount: decimal('budgeted_amount', { precision: 20, scale: 4 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 20, scale: 4 }).default('0').notNull(),
  month: integer('month'),
  notes: text('notes'),
});

export const budgetLinesRelations = relations(budgetLines, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetLines.budgetId],
    references: [budgets.id],
  }),
  account: one(accounts, {
    fields: [budgetLines.accountId],
    references: [accounts.id],
  }),
}));

// ─── TDS (Tax Deducted at Source) ────────────────────────

export const tdsSections = pgTable('tds_sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  section: varchar('section', { length: 10 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  rateIndividual: decimal('rate_individual', { precision: 8, scale: 4 }).notNull(),
  rateCompany: decimal('rate_company', { precision: 8, scale: 4 }).notNull(),
  thresholdLimit: decimal('threshold_limit', { precision: 20, scale: 4 }).default('0').notNull(),
  thresholdPeriod: tdsThresholdPeriodEnum('threshold_period').default('annual').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('tds_sections_tenant_id_idx').on(table.tenantId),
  index('tds_sections_tenant_section_idx').on(table.tenantId, table.section),
]);

export const tdsSectionsRelations = relations(tdsSections, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tdsSections.tenantId],
    references: [tenants.id],
  }),
}));

export const tdsDeductions = pgTable('tds_deductions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  billId: uuid('bill_id').references(() => bills.id, { onDelete: 'cascade' }).notNull(),
  supplierId: uuid('supplier_id').notNull(),
  tdsSectionId: uuid('tds_section_id').notNull(),
  grossAmount: decimal('gross_amount', { precision: 20, scale: 4 }).notNull(),
  tdsRate: decimal('tds_rate', { precision: 8, scale: 4 }).notNull(),
  tdsAmount: decimal('tds_amount', { precision: 20, scale: 4 }).notNull(),
  netAmount: decimal('net_amount', { precision: 20, scale: 4 }).notNull(),
  deductionDate: date('deduction_date').notNull(),
  fiscalYear: varchar('fiscal_year', { length: 9 }).notNull(),
  status: tdsDeductionStatusEnum('status').default('pending').notNull(),
  certificateNumber: varchar('certificate_number', { length: 50 }),
  depositDate: date('deposit_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('tds_deductions_tenant_id_idx').on(table.tenantId),
  index('tds_deductions_bill_id_idx').on(table.billId),
  index('tds_deductions_supplier_fy_idx').on(table.tenantId, table.supplierId, table.fiscalYear),
]);

export const tdsDeductionsRelations = relations(tdsDeductions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tdsDeductions.tenantId],
    references: [tenants.id],
  }),
  bill: one(bills, {
    fields: [tdsDeductions.billId],
    references: [bills.id],
  }),
  tdsSection: one(tdsSections, {
    fields: [tdsDeductions.tdsSectionId],
    references: [tdsSections.id],
  }),
}));

export const vendorTdsLedger = pgTable('vendor_tds_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  supplierId: uuid('supplier_id').notNull(),
  fiscalYear: varchar('fiscal_year', { length: 9 }).notNull(),
  cumulativePurchases: decimal('cumulative_purchases', { precision: 20, scale: 4 }).default('0').notNull(),
  cumulativeTds: decimal('cumulative_tds', { precision: 20, scale: 4 }).default('0').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('vendor_tds_ledger_tenant_supplier_fy_idx').on(table.tenantId, table.supplierId, table.fiscalYear),
]);

export const vendorTdsLedgerRelations = relations(vendorTdsLedger, ({ one }) => ({
  tenant: one(tenants, {
    fields: [vendorTdsLedger.tenantId],
    references: [tenants.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type BudgetLine = typeof budgetLines.$inferSelect;
export type NewBudgetLine = typeof budgetLines.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type JournalLine = typeof journalLines.$inferSelect;
export type NewJournalLine = typeof journalLines.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;
export type FiscalPeriod = typeof fiscalPeriods.$inferSelect;
export type NewFiscalPeriod = typeof fiscalPeriods.$inferInsert;
export type TaxRate = typeof taxRates.$inferSelect;
export type NewTaxRate = typeof taxRates.$inferInsert;
export type Currency = typeof currencies.$inferSelect;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type NewPaymentAllocation = typeof paymentAllocations.$inferInsert;
export type TdsSection = typeof tdsSections.$inferSelect;
export type NewTdsSection = typeof tdsSections.$inferInsert;
export type TdsDeduction = typeof tdsDeductions.$inferSelect;
export type NewTdsDeduction = typeof tdsDeductions.$inferInsert;
export type VendorTdsLedger = typeof vendorTdsLedger.$inferSelect;
export type NewVendorTdsLedger = typeof vendorTdsLedger.$inferInsert;

// ─── Recurring Invoice Templates ───────────────────────────────────
export const recurringInvoiceFrequencyEnum = pgEnum('recurring_invoice_frequency', [
  'weekly',
  'monthly',
  'quarterly',
  'half_yearly',
  'annually',
]);

export const recurringInvoiceTemplates = pgTable(
  'recurring_invoice_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    sourceInvoiceId: uuid('source_invoice_id').notNull(),
    frequency: recurringInvoiceFrequencyEnum('frequency').notNull(),
    nextRunDate: date('next_run_date').notNull(),
    endDate: date('end_date'),
    isActive: boolean('is_active').default(true).notNull(),
    totalGenerated: integer('total_generated').default(0).notNull(),
    lastGeneratedAt: timestamp('last_generated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('rec_invoice_tpl_tenant_idx').on(t.tenantId),
    index('rec_invoice_tpl_next_run_idx').on(t.tenantId, t.nextRunDate),
  ],
);
export type RecurringInvoiceTemplate = typeof recurringInvoiceTemplates.$inferSelect;
export type NewRecurringInvoiceTemplate = typeof recurringInvoiceTemplates.$inferInsert;
