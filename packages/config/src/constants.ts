// --- Pagination ---
export const DEFAULT_PAGINATION_LIMIT = 50;
export const MAX_PAGINATION_LIMIT = 1000;

// --- Authentication ---
export const JWT_ACCESS_TOKEN_EXPIRY = '15m';
export const JWT_REFRESH_TOKEN_EXPIRY = '7d';
export const PASSWORD_SALT_ROUNDS = 12;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 30;

// --- File Uploads ---
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_FILE_TYPES = {
  invoices: ['application/pdf', 'image/png', 'image/jpeg'],
  avatars: ['image/png', 'image/jpeg', 'image/webp'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/png',
    'image/jpeg',
  ],
} as const;

// --- Default Chart of Accounts ---
export const DEFAULT_CHART_OF_ACCOUNTS = [
  // Assets (1000-1999)
  { code: '1000', name: 'Assets', type: 'asset', is_header: true },
  { code: '1010', name: 'Cash on Hand', type: 'asset', is_header: false },
  { code: '1020', name: 'Bank Account', type: 'asset', is_header: false },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', is_header: false },
  { code: '1200', name: 'Inventory', type: 'asset', is_header: false },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset', is_header: false },
  { code: '1500', name: 'Fixed Assets', type: 'asset', is_header: true },
  { code: '1510', name: 'Equipment', type: 'asset', is_header: false },
  { code: '1520', name: 'Furniture & Fixtures', type: 'asset', is_header: false },
  { code: '1530', name: 'Vehicles', type: 'asset', is_header: false },
  { code: '1600', name: 'Accumulated Depreciation', type: 'contra_asset', is_header: false },

  // Liabilities (2000-2999)
  { code: '2000', name: 'Liabilities', type: 'liability', is_header: true },
  { code: '2010', name: 'Accounts Payable', type: 'liability', is_header: false },
  { code: '2100', name: 'Accrued Liabilities', type: 'liability', is_header: false },
  { code: '2200', name: 'Sales Tax Payable', type: 'liability', is_header: false },
  { code: '2300', name: 'Unearned Revenue', type: 'liability', is_header: false },
  { code: '2500', name: 'Long-Term Debt', type: 'liability', is_header: false },

  // Equity (3000-3999)
  { code: '3000', name: 'Equity', type: 'equity', is_header: true },
  { code: '3010', name: "Owner's Equity", type: 'equity', is_header: false },
  { code: '3020', name: 'Retained Earnings', type: 'equity', is_header: false },
  { code: '3030', name: 'Dividends', type: 'contra_equity', is_header: false },

  // Revenue (4000-4999)
  { code: '4000', name: 'Revenue', type: 'revenue', is_header: true },
  { code: '4010', name: 'Sales Revenue', type: 'revenue', is_header: false },
  { code: '4020', name: 'Service Revenue', type: 'revenue', is_header: false },
  { code: '4100', name: 'Other Income', type: 'revenue', is_header: false },
  { code: '4200', name: 'Sales Returns & Allowances', type: 'contra_revenue', is_header: false },
  { code: '4300', name: 'Sales Discounts', type: 'contra_revenue', is_header: false },

  // Expenses (5000-5999)
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', is_header: true },
  { code: '5010', name: 'Material Costs', type: 'expense', is_header: false },
  { code: '5020', name: 'Labor Costs', type: 'expense', is_header: false },
  { code: '5030', name: 'Manufacturing Overhead', type: 'expense', is_header: false },

  // Operating Expenses (6000-6999)
  { code: '6000', name: 'Operating Expenses', type: 'expense', is_header: true },
  { code: '6010', name: 'Rent Expense', type: 'expense', is_header: false },
  { code: '6020', name: 'Utilities Expense', type: 'expense', is_header: false },
  { code: '6030', name: 'Office Supplies', type: 'expense', is_header: false },
  { code: '6040', name: 'Insurance Expense', type: 'expense', is_header: false },
  { code: '6050', name: 'Depreciation Expense', type: 'expense', is_header: false },
  { code: '6060', name: 'Salaries & Wages', type: 'expense', is_header: false },
  { code: '6070', name: 'Marketing & Advertising', type: 'expense', is_header: false },
  { code: '6080', name: 'Travel & Entertainment', type: 'expense', is_header: false },
  { code: '6090', name: 'Professional Fees', type: 'expense', is_header: false },
  { code: '6100', name: 'Bank Charges & Fees', type: 'expense', is_header: false },
  { code: '6200', name: 'Miscellaneous Expense', type: 'expense', is_header: false },
] as const;
