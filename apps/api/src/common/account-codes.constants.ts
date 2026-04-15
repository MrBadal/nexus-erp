/**
 * Canonical chart-of-accounts codes used by NexusERP's auto-posting logic.
 *
 * Lookups elsewhere in the codebase should prefer these codes over fragile
 * LIKE '%keyword%' matches on account names. If an account is missing, seed
 * it via the tenant onboarding script rather than changing the lookup.
 */
export const ACCOUNT_CODES = {
  // Assets
  AR: '1200',                   // Accounts Receivable
  INVENTORY: '1300',
  ACCUM_DEPRECIATION: '1600',

  // Liabilities
  AP: '2100',                   // Accounts Payable
  OUTPUT_GST: '2210',           // Output GST (all flavours aggregated)
  TDS_PAYABLE: '2300',
  INPUT_GST: '2310',            // ITC (claimable)
  RCM_LIABILITY: '2320',        // Reverse Charge payable

  // Revenue
  REVENUE: '4000',

  // Expenses
  DEPRECIATION_EXPENSE: '6050',
  BLOCKED_ITC_EXPENSE: '6060',
} as const;

export type AccountCode = typeof ACCOUNT_CODES[keyof typeof ACCOUNT_CODES];
