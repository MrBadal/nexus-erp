export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
  CONTRA_ASSET = 'contra_asset',
  CONTRA_LIABILITY = 'contra_liability',
  CONTRA_EQUITY = 'contra_equity',
  CONTRA_REVENUE = 'contra_revenue',
  CONTRA_EXPENSE = 'contra_expense',
}

export enum NormalBalance {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum FinancialStatement {
  BALANCE_SHEET = 'balance_sheet',
  INCOME_STATEMENT = 'income_statement',
}

export interface Account {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  account_type: AccountType;
  normal_balance: NormalBalance;
  financial_statement: FinancialStatement;
  parent_id: string | null;
  is_system: boolean;
  is_active: boolean;
  is_header: boolean;
  currency: string;
  balance: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateAccountDto {
  code: string;
  name: string;
  description?: string;
  account_type: AccountType;
  parent_id?: string;
  is_header?: boolean;
  currency?: string;
}

export interface UpdateAccountDto {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  parent_id?: string | null;
}

// --- Journal Entries ---

export enum JournalEntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  VOIDED = 'voided',
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  currency: string;
  exchange_rate: number;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  entry_number: string;
  date: string;
  reference: string | null;
  description: string;
  status: JournalEntryStatus;
  source_type: string | null;
  source_id: string | null;
  fiscal_period_id: string | null;
  posted_at: string | null;
  posted_by: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  lines: JournalLine[];
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateJournalEntryDto {
  date: string;
  reference?: string;
  description: string;
  lines: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
    currency?: string;
    exchange_rate?: number;
  }[];
  post_immediately?: boolean;
}

// --- Invoices ---

export enum InvoiceType {
  SALES = 'sales',
  PURCHASE = 'purchase',
  CREDIT_NOTE = 'credit_note',
  DEBIT_NOTE = 'debit_note',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  VOIDED = 'voided',
  CANCELLED = 'cancelled',
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate_id: string | null;
  tax_amount: number;
  line_total: number;
  account_id: string;
  sort_order: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  status: InvoiceStatus;
  contact_id: string;
  date: string;
  due_date: string;
  reference: string | null;
  notes: string | null;
  terms: string | null;
  subtotal: number;
  discount_type: 'percentage' | 'fixed' | null;
  discount_value: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  exchange_rate: number;
  lines: InvoiceLine[];
  journal_entry_id: string | null;
  sent_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateInvoiceDto {
  invoice_type: InvoiceType;
  contact_id: string;
  date: string;
  due_date: string;
  reference?: string;
  notes?: string;
  terms?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  currency?: string;
  exchange_rate?: number;
  lines: {
    item_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percent?: number;
    tax_rate_id?: string;
    account_id: string;
    sort_order?: number;
  }[];
}

// --- Payments ---

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  ONLINE = 'online',
  MOBILE_MONEY = 'mobile_money',
  OTHER = 'other',
}

export interface Payment {
  id: string;
  tenant_id: string;
  payment_number: string;
  payment_type: 'received' | 'made';
  contact_id: string;
  date: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  payment_method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  account_id: string;
  invoice_id: string | null;
  journal_entry_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreatePaymentDto {
  payment_type: 'received' | 'made';
  contact_id: string;
  date: string;
  amount: number;
  currency?: string;
  exchange_rate?: number;
  payment_method: PaymentMethod;
  reference?: string;
  notes?: string;
  account_id: string;
  invoice_id?: string;
}

// --- Tax, Currency, Fiscal Period ---

export interface TaxRate {
  id: string;
  tenant_id: string;
  name: string;
  rate: number;
  code: string;
  description: string | null;
  is_compound: boolean;
  is_active: boolean;
  account_id: string;
  created_at: string;
  updated_at: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
}

export interface ExchangeRate {
  id: string;
  tenant_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  source: string;
  created_at: string;
}

export interface FiscalPeriod {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
}
