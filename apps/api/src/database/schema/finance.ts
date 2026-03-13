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
  currencyCode: varchar('currency_code', { length: 3 }).default('USD').notNull(),
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
});

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
  currencyCode: varchar('currency_code', { length: 3 }).default('USD').notNull(),
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
});

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
});

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
  currencyCode: varchar('currency_code', { length: 3 }).default('USD').notNull(),
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
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

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
  currencyCode: varchar('currency_code', { length: 3 }).default('USD').notNull(),
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
});

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
  currencyCode: varchar('currency_code', { length: 3 }).default('USD').notNull(),
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
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

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
  currencyCode: varchar('currency_code', { length: 3 }).default('USD').notNull(),
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

// ─── Type Exports ───────────────────────────────────────

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
