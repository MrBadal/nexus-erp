import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, lte, gte, inArray } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  accounts,
  journalEntries,
  journalLines,
  invoices,
  bills,
  payments,
  budgets,
  budgetLines,
  tdsDeductions,
  tdsSections,
  suppliers,
} from '../../../database/schema/index.js';

@Injectable()
export class ReportService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  /**
   * General Ledger: all posted journal lines, optionally filtered by account and date range.
   */
  async getGeneralLedger(
    tenantId: string,
    options?: { accountId?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number },
  ) {
    const conditions = [
      eq(journalEntries.tenantId, tenantId),
      eq(journalEntries.status, 'posted'),
    ];

    if (options?.fromDate) {
      conditions.push(gte(journalEntries.date, options.fromDate));
    }
    if (options?.toDate) {
      conditions.push(lte(journalEntries.date, options.toDate));
    }

    let accountFilter: ReturnType<typeof eq> | undefined;
    if (options?.accountId) {
      accountFilter = eq(journalLines.accountId, options.accountId);
    }

    const allConditions = accountFilter
      ? and(...conditions, accountFilter)
      : and(...conditions);

    const results = await this.db
      .select({
        lineId: journalLines.id,
        date: journalEntries.date,
        entryNumber: journalEntries.entryNumber,
        description: journalLines.description,
        accountId: journalLines.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        debitAmount: journalLines.debitAmount,
        creditAmount: journalLines.creditAmount,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(allConditions!)
      .orderBy(journalEntries.date, journalEntries.entryNumber)
      .limit(options?.limit || 500)
      .offset(options?.offset || 0);

    // Compute running balance per account
    let runningBalance = 0;
    const linesWithBalance = results.map((line) => {
      const debit = parseFloat(line.debitAmount || '0');
      const credit = parseFloat(line.creditAmount || '0');
      runningBalance += debit - credit;
      return {
        ...line,
        debitAmount: debit.toFixed(4),
        creditAmount: credit.toFixed(4),
        runningBalance: runningBalance.toFixed(4),
      };
    });

    return { lines: linesWithBalance, count: linesWithBalance.length };
  }

  /**
   * Trial Balance: sum of debits and credits per account up to a given date.
   */
  async getTrialBalance(tenantId: string, asOfDate?: string) {
    const conditions = [
      eq(journalEntries.tenantId, tenantId),
      eq(journalEntries.status, 'posted'),
    ];

    if (asOfDate) {
      conditions.push(lte(journalEntries.date, asOfDate));
    }

    const results = await this.db
      .select({
        accountId: accounts.id,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.accountType,
        totalDebit: sql<string>`COALESCE(SUM(CAST(${journalLines.debitAmount} AS NUMERIC)), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CAST(${journalLines.creditAmount} AS NUMERIC)), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(and(...conditions))
      .groupBy(accounts.id, accounts.code, accounts.name, accounts.accountType)
      .orderBy(accounts.code);

    const rows = results.map((row) => {
      const debit = parseFloat(row.totalDebit);
      const credit = parseFloat(row.totalCredit);
      const net = debit - credit;
      return {
        accountId: row.accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        accountType: row.accountType,
        debitBalance: net > 0 ? net.toFixed(4) : '0.0000',
        creditBalance: net < 0 ? Math.abs(net).toFixed(4) : '0.0000',
      };
    });

    const totalDebits = rows.reduce((s, r) => s + parseFloat(r.debitBalance), 0);
    const totalCredits = rows.reduce((s, r) => s + parseFloat(r.creditBalance), 0);

    return {
      rows,
      totalDebits: totalDebits.toFixed(4),
      totalCredits: totalCredits.toFixed(4),
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Profit & Loss: revenue minus expenses for a date range.
   */
  async getProfitAndLoss(tenantId: string, fromDate?: string, toDate?: string) {
    const conditions = [
      eq(journalEntries.tenantId, tenantId),
      eq(journalEntries.status, 'posted'),
    ];

    if (fromDate) conditions.push(gte(journalEntries.date, fromDate));
    if (toDate) conditions.push(lte(journalEntries.date, toDate));

    const results = await this.db
      .select({
        accountId: accounts.id,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.accountType,
        category: accounts.financialStatement,
        totalDebit: sql<string>`COALESCE(SUM(CAST(${journalLines.debitAmount} AS NUMERIC)), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CAST(${journalLines.creditAmount} AS NUMERIC)), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(and(...conditions, inArray(accounts.accountType, ['revenue', 'expense'])))
      .groupBy(accounts.id, accounts.code, accounts.name, accounts.accountType, accounts.financialStatement)
      .orderBy(accounts.accountType, accounts.code);

    const revenueAccounts = results
      .filter((r) => r.accountType === 'revenue')
      .map((r) => ({
        accountCode: r.accountCode,
        accountName: r.accountName,
        financialStatement: r.category,
        amount: (parseFloat(r.totalCredit) - parseFloat(r.totalDebit)).toFixed(4),
      }));

    const expenseAccounts = results
      .filter((r) => r.accountType === 'expense')
      .map((r) => ({
        accountCode: r.accountCode,
        accountName: r.accountName,
        financialStatement: r.category,
        amount: (parseFloat(r.totalDebit) - parseFloat(r.totalCredit)).toFixed(4),
      }));

    const totalRevenue = revenueAccounts.reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalExpenses = expenseAccounts.reduce((s, r) => s + parseFloat(r.amount), 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      revenue: revenueAccounts,
      expenses: expenseAccounts,
      totalRevenue: totalRevenue.toFixed(4),
      totalExpenses: totalExpenses.toFixed(4),
      netIncome: netIncome.toFixed(4),
      fromDate: fromDate || null,
      toDate: toDate || new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Balance Sheet: assets = liabilities + equity as of a given date.
   */
  async getBalanceSheet(tenantId: string, asOfDate?: string) {
    const conditions = [
      eq(journalEntries.tenantId, tenantId),
      eq(journalEntries.status, 'posted'),
    ];

    if (asOfDate) {
      conditions.push(lte(journalEntries.date, asOfDate));
    }

    const results = await this.db
      .select({
        accountId: accounts.id,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.accountType,
        category: accounts.financialStatement,
        totalDebit: sql<string>`COALESCE(SUM(CAST(${journalLines.debitAmount} AS NUMERIC)), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CAST(${journalLines.creditAmount} AS NUMERIC)), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(and(...conditions))
      .groupBy(accounts.id, accounts.code, accounts.name, accounts.accountType, accounts.financialStatement)
      .orderBy(accounts.accountType, accounts.code);

    const assetAccounts = results
      .filter((r) => r.accountType === 'asset' || r.accountType === 'contra_asset')
      .map((r) => {
        const net = r.accountType === 'contra_asset'
          ? parseFloat(r.totalCredit) - parseFloat(r.totalDebit)
          : parseFloat(r.totalDebit) - parseFloat(r.totalCredit);
        return {
          accountCode: r.accountCode,
          accountName: r.accountName,
          financialStatement: r.category,
          balance: net.toFixed(4),
        };
      });

    const liabilityAccounts = results
      .filter((r) => r.accountType === 'liability' || r.accountType === 'contra_liability')
      .map((r) => ({
        accountCode: r.accountCode,
        accountName: r.accountName,
        financialStatement: r.category,
        balance: (parseFloat(r.totalCredit) - parseFloat(r.totalDebit)).toFixed(4),
      }));

    const equityAccounts = results
      .filter((r) => r.accountType === 'equity' || r.accountType === 'contra_equity')
      .map((r) => ({
        accountCode: r.accountCode,
        accountName: r.accountName,
        financialStatement: r.category,
        balance: (parseFloat(r.totalCredit) - parseFloat(r.totalDebit)).toFixed(4),
      }));

    // Calculate retained earnings (P&L to date)
    const revenueTotal = results
      .filter((r) => r.accountType === 'revenue')
      .reduce((s, r) => s + parseFloat(r.totalCredit) - parseFloat(r.totalDebit), 0);
    const expenseTotal = results
      .filter((r) => r.accountType === 'expense')
      .reduce((s, r) => s + parseFloat(r.totalDebit) - parseFloat(r.totalCredit), 0);
    const retainedEarnings = revenueTotal - expenseTotal;

    const totalAssets = assetAccounts.reduce((s, a) => s + parseFloat(a.balance), 0);
    const totalLiabilities = liabilityAccounts.reduce((s, l) => s + parseFloat(l.balance), 0);
    const totalEquity = equityAccounts.reduce((s, e) => s + parseFloat(e.balance), 0) + retainedEarnings;

    return {
      assets: assetAccounts,
      liabilities: liabilityAccounts,
      equity: equityAccounts,
      retainedEarnings: retainedEarnings.toFixed(4),
      totalAssets: totalAssets.toFixed(4),
      totalLiabilities: totalLiabilities.toFixed(4),
      totalEquity: totalEquity.toFixed(4),
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Cash Flow statement: operating, investing, financing activities.
   */
  async getCashFlow(tenantId: string, fromDate?: string, toDate?: string) {
    const conditions = [
      eq(journalEntries.tenantId, tenantId),
      eq(journalEntries.status, 'posted'),
    ];

    if (fromDate) conditions.push(gte(journalEntries.date, fromDate));
    if (toDate) conditions.push(lte(journalEntries.date, toDate));

    // Get all journal lines with account info for the period
    const results = await this.db
      .select({
        accountType: accounts.accountType,
        accountCode: accounts.code,
        financialStatement: accounts.financialStatement,
        totalDebit: sql<string>`COALESCE(SUM(CAST(${journalLines.debitAmount} AS NUMERIC)), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CAST(${journalLines.creditAmount} AS NUMERIC)), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(and(...conditions))
      .groupBy(accounts.accountType, accounts.code, accounts.financialStatement);

    // Operating: revenue and expense related cash
    let operatingCashFlow = 0;
    // Investing: asset related cash
    let investingCashFlow = 0;
    // Financing: equity and liability related cash
    let financingCashFlow = 0;

    for (const row of results) {
      const netDebit = parseFloat(row.totalDebit) - parseFloat(row.totalCredit);

      if (row.accountType === 'revenue' || row.accountType === 'expense') {
        // Operating activities
        if (row.accountType === 'revenue') {
          operatingCashFlow += parseFloat(row.totalCredit) - parseFloat(row.totalDebit);
        } else {
          operatingCashFlow -= parseFloat(row.totalDebit) - parseFloat(row.totalCredit);
        }
      } else if (row.accountType === 'asset' && !row.accountCode.startsWith('11') && !row.accountCode.startsWith('12')) {
        // Investing activities (non-cash/bank assets — codes 11xx and 12xx are cash/bank)
        investingCashFlow -= netDebit;
      } else if (row.accountType === 'equity' || row.accountType === 'liability') {
        // Financing activities
        financingCashFlow += parseFloat(row.totalCredit) - parseFloat(row.totalDebit);
      }
    }

    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

    return {
      operating: operatingCashFlow.toFixed(4),
      investing: investingCashFlow.toFixed(4),
      financing: financingCashFlow.toFixed(4),
      netCashFlow: netCashFlow.toFixed(4),
      fromDate: fromDate || null,
      toDate: toDate || new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Accounts Receivable Aging: open invoices bucketed by days overdue.
   */
  async getReceivableAging(tenantId: string, asOfDate?: string) {
    const refDate = asOfDate || new Date().toISOString().split('T')[0];

    const openInvoices = await this.db.select().from(invoices).where(
      and(
        eq(invoices.tenantId, tenantId),
        sql`${invoices.status} NOT IN ('draft', 'void', 'cancelled')`,
        sql`CAST(${invoices.balanceDue} AS numeric) > 0`,
      )
    );

    const buckets = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 };
    const rows: Array<{ customerId: string | null; invoiceNumber: string; dueDate: string; balanceDue: number; daysOverdue: number; bucket: string }> = [];

    for (const inv of openInvoices) {
      const due = new Date(inv.dueDate);
      const ref = new Date(refDate);
      const daysOverdue = Math.max(0, Math.floor((ref.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
      const balance = parseFloat(inv.balanceDue);

      let bucket = 'current';
      if (daysOverdue === 0) { buckets.current += balance; bucket = 'current'; }
      else if (daysOverdue <= 30) { buckets.days1to30 += balance; bucket = '1-30'; }
      else if (daysOverdue <= 60) { buckets.days31to60 += balance; bucket = '31-60'; }
      else if (daysOverdue <= 90) { buckets.days61to90 += balance; bucket = '61-90'; }
      else { buckets.days90plus += balance; bucket = '90+'; }
      buckets.total += balance;

      rows.push({
        customerId: inv.customerId,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        balanceDue: balance,
        daysOverdue,
        bucket,
      });
    }

    return { rows, bucketTotals: buckets };
  }

  /**
   * Accounts Payable Aging: open bills bucketed by days overdue.
   */
  async getPayableAging(tenantId: string, asOfDate?: string) {
    const refDate = asOfDate || new Date().toISOString().split('T')[0];

    const openBills = await this.db.select().from(bills).where(
      and(
        eq(bills.tenantId, tenantId),
        sql`${bills.status} NOT IN ('draft', 'void', 'cancelled')`,
        sql`CAST(${bills.balanceDue} AS numeric) > 0`,
      )
    );

    const buckets = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 };
    const rows: Array<{ vendorId: string | null; billNumber: string; dueDate: string; balanceDue: number; daysOverdue: number; bucket: string }> = [];

    for (const bill of openBills) {
      const due = new Date(bill.dueDate);
      const ref = new Date(refDate);
      const daysOverdue = Math.max(0, Math.floor((ref.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
      const balance = parseFloat(bill.balanceDue);

      let bucket = 'current';
      if (daysOverdue === 0) { buckets.current += balance; bucket = 'current'; }
      else if (daysOverdue <= 30) { buckets.days1to30 += balance; bucket = '1-30'; }
      else if (daysOverdue <= 60) { buckets.days31to60 += balance; bucket = '31-60'; }
      else if (daysOverdue <= 90) { buckets.days61to90 += balance; bucket = '61-90'; }
      else { buckets.days90plus += balance; bucket = '90+'; }
      buckets.total += balance;

      rows.push({
        vendorId: bill.vendorId,
        billNumber: bill.billNumber,
        dueDate: bill.dueDate,
        balanceDue: balance,
        daysOverdue,
        bucket,
      });
    }

    return { rows, bucketTotals: buckets };
  }

  /**
   * Budget Variance Report: compare budgeted vs actual amounts per account.
   */
  async getBudgetVarianceReport(tenantId: string, budgetId: string) {
    const [budget] = await this.db.select().from(budgets).where(
      and(eq(budgets.id, budgetId), eq(budgets.tenantId, tenantId))
    );
    if (!budget) return null;

    const lines = await this.db
      .select({
        id: budgetLines.id,
        accountId: budgetLines.accountId,
        accountName: accounts.name,
        accountCode: accounts.code,
        budgetedAmount: budgetLines.budgetedAmount,
        actualAmount: budgetLines.actualAmount,
        month: budgetLines.month,
      })
      .from(budgetLines)
      .leftJoin(accounts, eq(budgetLines.accountId, accounts.id))
      .where(eq(budgetLines.budgetId, budgetId));

    let totalBudgeted = 0, totalActual = 0, overBudgetCount = 0, onTrackCount = 0;

    const varianceLines = lines.map(line => {
      const budgeted = parseFloat(line.budgetedAmount);
      const actual = parseFloat(line.actualAmount);
      const variance = budgeted - actual;
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      let flag: 'over_budget' | 'under_budget' | 'on_track' = 'on_track';
      if (actual > budgeted) { flag = 'over_budget'; overBudgetCount++; }
      else if (actual < budgeted * 0.9) { flag = 'under_budget'; }
      else { onTrackCount++; }

      totalBudgeted += budgeted;
      totalActual += actual;

      return { ...line, variance, variancePercent, flag };
    });

    return {
      budget,
      lines: varianceLines,
      summary: {
        totalBudgeted,
        totalActual,
        totalVariance: totalBudgeted - totalActual,
        overBudgetCount,
        onTrackCount,
      },
    };
  }

  /**
   * Vendor Ledger: bills and payments for a specific supplier with running balance.
   */
  async getVendorLedger(tenantId: string, supplierId: string, fromDate?: string, toDate?: string) {
    const billConditions: ReturnType<typeof eq>[] = [
      eq(bills.tenantId, tenantId),
      eq(bills.vendorId, supplierId),
      sql`${bills.status} NOT IN ('draft', 'void', 'cancelled')`,
    ];
    if (fromDate) billConditions.push(sql`${bills.issueDate} >= ${fromDate}`);
    if (toDate) billConditions.push(sql`${bills.issueDate} <= ${toDate}`);

    const vendorBills = await this.db.select({
      date: bills.issueDate,
      documentNumber: bills.billNumber,
      total: bills.total,
    }).from(bills).where(and(...billConditions));

    const paymentConditions: ReturnType<typeof eq>[] = [
      eq(payments.tenantId, tenantId),
      eq(payments.vendorId, supplierId),
      eq(payments.type, 'made'),
      sql`${payments.status} NOT IN ('draft', 'void')`,
    ];
    if (fromDate) paymentConditions.push(sql`${payments.date} >= ${fromDate}`);
    if (toDate) paymentConditions.push(sql`${payments.date} <= ${toDate}`);

    const vendorPayments = await this.db.select({
      date: payments.date,
      documentNumber: payments.paymentNumber,
      amount: payments.amount,
    }).from(payments).where(and(...paymentConditions));

    // Merge and sort by date
    const transactions: Array<{ date: string; type: string; documentNumber: string; debit: number; credit: number; runningBalance: number }> = [];

    for (const b of vendorBills) {
      transactions.push({ date: b.date, type: 'bill', documentNumber: b.documentNumber, debit: parseFloat(b.total), credit: 0, runningBalance: 0 });
    }
    for (const p of vendorPayments) {
      transactions.push({ date: p.date, type: 'payment', documentNumber: p.documentNumber, debit: 0, credit: parseFloat(p.amount), runningBalance: 0 });
    }

    transactions.sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = 0;
    for (const t of transactions) {
      runningBalance += t.debit - t.credit;
      t.runningBalance = runningBalance;
    }

    return {
      transactions,
      openingBalance: 0,
      closingBalance: runningBalance,
    };
  }

  /**
   * TDS Payment Report: deductions for a fiscal year and optional quarter.
   */
  async getTdsPaymentReport(tenantId: string, fiscalYear: string, quarter?: number) {
    const conditions: ReturnType<typeof eq>[] = [
      eq(tdsDeductions.tenantId, tenantId),
      eq(tdsDeductions.fiscalYear, fiscalYear),
    ];

    if (quarter) {
      // Indian fiscal quarters: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
      const [startYear] = fiscalYear.split('-').map(Number);
      const quarters: Record<number, { from: string; to: string }> = {
        1: { from: `${startYear}-04-01`, to: `${startYear}-06-30` },
        2: { from: `${startYear}-07-01`, to: `${startYear}-09-30` },
        3: { from: `${startYear}-10-01`, to: `${startYear}-12-31` },
        4: { from: `${startYear + 1}-01-01`, to: `${startYear + 1}-03-31` },
      };
      const q = quarters[quarter];
      if (q) {
        conditions.push(sql`${tdsDeductions.deductionDate} >= ${q.from}`);
        conditions.push(sql`${tdsDeductions.deductionDate} <= ${q.to}`);
      }
    }

    const deductions = await this.db.select().from(tdsDeductions).where(and(...conditions));

    return { deductions, fiscalYear, quarter };
  }

  /**
   * TDS Return Report (26Q format): deductions grouped for quarterly filing.
   */
  async getTdsReturnReport(tenantId: string, fiscalYear: string, quarter: number) {
    const [startYear] = fiscalYear.split('-').map(Number);
    const quarters: Record<number, { from: string; to: string }> = {
      1: { from: `${startYear}-04-01`, to: `${startYear}-06-30` },
      2: { from: `${startYear}-07-01`, to: `${startYear}-09-30` },
      3: { from: `${startYear}-10-01`, to: `${startYear}-12-31` },
      4: { from: `${startYear + 1}-01-01`, to: `${startYear + 1}-03-31` },
    };
    const q = quarters[quarter];
    if (!q) return { rows: [] as Array<{ supplierId: string; section: string; grossAmount: string; tdsRate: string; tdsAmount: string; deductionDate: string }> };

    const deductions = await this.db
      .select({
        supplierId: tdsDeductions.supplierId,
        section: tdsDeductions.tdsSectionId,
        grossAmount: tdsDeductions.grossAmount,
        tdsRate: tdsDeductions.tdsRate,
        tdsAmount: tdsDeductions.tdsAmount,
        deductionDate: tdsDeductions.deductionDate,
      })
      .from(tdsDeductions)
      .where(and(
        eq(tdsDeductions.tenantId, tenantId),
        eq(tdsDeductions.fiscalYear, fiscalYear),
        sql`${tdsDeductions.deductionDate} >= ${q.from}`,
        sql`${tdsDeductions.deductionDate} <= ${q.to}`,
      ));

    return { rows: deductions, fiscalYear, quarter };
  }
}
