'use client';

import { useQuery } from '@tanstack/react-query';
import api, { get, endpoints, buildQueryString } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────

export interface GeneralLedgerLine {
  lineId: string;
  date: string;
  entryNumber: string;
  description: string | null;
  accountId: string | null;
  accountCode: string;
  accountName: string;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
}

export interface GeneralLedgerResult {
  lines: GeneralLedgerLine[];
  count: number;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: string;
  creditBalance: string;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebits: string;
  totalCredits: string;
  isBalanced: boolean;
  asOfDate: string;
}

export interface ProfitLossAccount {
  accountCode: string;
  accountName: string;
  financialStatement: string | null;
  amount: string;
}

export interface ProfitLossResult {
  revenue: ProfitLossAccount[];
  expenses: ProfitLossAccount[];
  totalRevenue: string;
  totalExpenses: string;
  netIncome: string;
  fromDate: string | null;
  toDate: string;
}

export interface BalanceSheetAccount {
  accountCode: string;
  accountName: string;
  financialStatement: string | null;
  balance: string;
}

export interface BalanceSheetResult {
  assets: BalanceSheetAccount[];
  liabilities: BalanceSheetAccount[];
  equity: BalanceSheetAccount[];
  retainedEarnings: string;
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  isBalanced: boolean;
  asOfDate: string;
}

export interface CashFlowResult {
  operating: string;
  investing: string;
  financing: string;
  netCashFlow: string;
  fromDate: string | null;
  toDate: string;
}

export interface AgingBucket {
  entityId: string;
  entityName: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface AgingResult {
  buckets: AgingBucket[];
  totals: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    over90: number;
    total: number;
  };
}

export interface BudgetVarianceLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  flag: string;
}

export interface BudgetVarianceResult {
  budgetName: string;
  periodStart: string;
  periodEnd: string;
  lines: BudgetVarianceLine[];
}

export interface VendorLedgerEntry {
  date: string;
  type: 'bill' | 'payment';
  reference: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface VendorLedgerResult {
  supplierName: string;
  entries: VendorLedgerEntry[];
  openingBalance: number;
  closingBalance: number;
}

export interface TdsPaymentRow {
  supplierId: string;
  supplierName: string;
  panNumber: string;
  section: string;
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  status: string;
}

export interface TdsPaymentResult {
  rows: TdsPaymentRow[];
  totalGross: number;
  totalTds: number;
}

export interface TdsReturnRow {
  deducteeType: string;
  deducteeName: string;
  pan: string;
  section: string;
  dateOfPayment: string;
  amountPaid: number;
  tdsDeducted: number;
  dateOfDeduction: string;
}

export interface TdsReturnResult {
  rows: TdsReturnRow[];
  summary: {
    totalAmountPaid: number;
    totalTdsDeducted: number;
  };
}

// ─── Query Keys ────────────────────────────────────────────────────

const reportKeys = {
  all: ['reports'] as const,
  generalLedger: (params: Record<string, string | undefined>) =>
    [...reportKeys.all, 'general-ledger', params] as const,
  trialBalance: (asOfDate?: string) =>
    [...reportKeys.all, 'trial-balance', asOfDate] as const,
  profitLoss: (fromDate?: string, toDate?: string) =>
    [...reportKeys.all, 'profit-loss', fromDate, toDate] as const,
  balanceSheet: (asOfDate?: string) =>
    [...reportKeys.all, 'balance-sheet', asOfDate] as const,
  cashFlow: (fromDate?: string, toDate?: string) =>
    [...reportKeys.all, 'cash-flow', fromDate, toDate] as const,
  receivableAging: (asOfDate?: string) =>
    [...reportKeys.all, 'receivable-aging', asOfDate] as const,
  payableAging: (asOfDate?: string) =>
    [...reportKeys.all, 'payable-aging', asOfDate] as const,
  budgetVariance: (budgetId: string) =>
    [...reportKeys.all, 'budget-variance', budgetId] as const,
  vendorLedger: (supplierId: string, fromDate?: string, toDate?: string) =>
    [...reportKeys.all, 'vendor-ledger', supplierId, fromDate, toDate] as const,
  tdsPayment: (fiscalYear: string, quarter?: number) =>
    [...reportKeys.all, 'tds-payment', fiscalYear, quarter] as const,
  tdsReturn: (fiscalYear: string, quarter: number) =>
    [...reportKeys.all, 'tds-return', fiscalYear, quarter] as const,
};

// ─── Hooks ────────────────────────────────────────────────────

export function useGeneralLedger(options: {
  accountId?: string;
  fromDate?: string;
  toDate?: string;
  enabled?: boolean;
}) {
  const params = {
    accountId: options.accountId,
    fromDate: options.fromDate,
    toDate: options.toDate,
  };
  return useQuery({
    queryKey: reportKeys.generalLedger(params),
    queryFn: () =>
      get<GeneralLedgerResult>(
        endpoints.reports.generalLedger + buildQueryString(params),
      ),
    enabled: options.enabled !== false,
  });
}

export function useTrialBalance(asOfDate?: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.trialBalance(asOfDate),
    queryFn: () =>
      get<TrialBalanceResult>(
        endpoints.reports.trialBalance + buildQueryString({ asOfDate }),
      ),
    enabled,
  });
}

export function useProfitLoss(fromDate?: string, toDate?: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.profitLoss(fromDate, toDate),
    queryFn: () =>
      get<ProfitLossResult>(
        endpoints.reports.profitLoss + buildQueryString({ fromDate, toDate }),
      ),
    enabled,
  });
}

export function useBalanceSheet(asOfDate?: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.balanceSheet(asOfDate),
    queryFn: () =>
      get<BalanceSheetResult>(
        endpoints.reports.balanceSheet + buildQueryString({ asOfDate }),
      ),
    enabled,
  });
}

export function useCashFlow(fromDate?: string, toDate?: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.cashFlow(fromDate, toDate),
    queryFn: () =>
      get<CashFlowResult>(
        endpoints.reports.cashFlow + buildQueryString({ fromDate, toDate }),
      ),
    enabled,
  });
}

export function useReceivableAging(asOfDate?: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.receivableAging(asOfDate),
    queryFn: () =>
      get<AgingResult>(
        endpoints.reports.receivableAging + buildQueryString({ asOfDate }),
      ),
    enabled,
  });
}

export function usePayableAging(asOfDate?: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.payableAging(asOfDate),
    queryFn: () =>
      get<AgingResult>(
        endpoints.reports.payableAging + buildQueryString({ asOfDate }),
      ),
    enabled,
  });
}

export function useBudgetVariance(budgetId: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.budgetVariance(budgetId),
    queryFn: () =>
      get<BudgetVarianceResult>(endpoints.reports.budgetVariance(budgetId)),
    enabled: enabled && !!budgetId,
  });
}

export function useVendorLedger(supplierId: string, fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: reportKeys.vendorLedger(supplierId, fromDate, toDate),
    queryFn: () =>
      get<VendorLedgerResult>(
        endpoints.reports.vendorLedger(supplierId) + buildQueryString({ fromDate, toDate }),
      ),
    enabled: !!supplierId,
  });
}

export function useTdsPayment(fiscalYear: string, quarter?: number, enabled = true) {
  return useQuery({
    queryKey: reportKeys.tdsPayment(fiscalYear, quarter),
    queryFn: () =>
      get<TdsPaymentResult>(
        endpoints.reports.tdsPayment + buildQueryString({ fiscalYear, quarter }),
      ),
    enabled: enabled && !!fiscalYear,
  });
}

// ─── PDF download ─────────────────────────────────────────────

/**
 * Download a report PDF through the authenticated axios instance
 * (the Authorization header is attached by the api interceptor) and
 * trigger a browser download via an object URL.
 */
export async function downloadReportPdf(
  report: 'trial-balance' | 'profit-loss' | 'balance-sheet',
  params: Record<string, string | undefined>,
  filename: string,
): Promise<void> {
  const response = await api.get(
    `/finance/reports/${report}/pdf${buildQueryString(params)}`,
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useTdsReturn(fiscalYear: string, quarter: number, enabled = true) {
  return useQuery({
    queryKey: reportKeys.tdsReturn(fiscalYear, quarter),
    queryFn: () =>
      get<TdsReturnResult>(
        endpoints.reports.tdsReturn + buildQueryString({ fiscalYear, quarter }),
      ),
    enabled: enabled && !!fiscalYear && !!quarter,
  });
}
