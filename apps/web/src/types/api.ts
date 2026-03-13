// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Auth types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "super_admin" | "admin" | "manager" | "accountant" | "user" | "viewer";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  tenant: Tenant;
  permissions: Permission[];
}

export interface RegisterRequest {
  companyName: string;
  companySlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  billingEmail: string;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
  tenant: Tenant;
  permissions: Permission[];
}

export interface ForgotPasswordRequest {
  email: string;
  tenantSlug: string;
}

export interface Permission {
  id: string;
  module: string;
  resource: string;
  action: string;
}

// Tenant
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  industry?: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Finance: Chart of Accounts
export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subType?: string;
  parentId?: string;
  description?: string;
  balance: number;
  currency: string;
  isActive: boolean;
  isSystemAccount: boolean;
  children?: Account[];
  createdAt: string;
  updatedAt: string;
}

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

// Finance: Journal Entries
export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: JournalEntryStatus;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  approvedBy?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type JournalEntryStatus = "draft" | "pending" | "approved" | "posted" | "voided";

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

// Finance: Invoices
export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  customerId?: string;
  customerName?: string;
  vendorId?: string;
  vendorName?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  lines: InvoiceLine[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceType = "sales" | "purchase";
export type InvoiceStatus = "draft" | "sent" | "viewed" | "partial" | "paid" | "overdue" | "cancelled";

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
  accountId: string;
}
