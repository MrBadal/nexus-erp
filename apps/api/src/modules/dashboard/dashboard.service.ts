import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, desc, lt } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import {
  accounts,
  journalLines,
  journalEntries,
  invoices,
  payments,
} from '../../database/schema/index.js';

@Injectable()
export class DashboardService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async getKpis(tenantId: string) {
    const [
      totalRevenue,
      totalExpenses,
      accountsReceivable,
      accountsPayable,
      cashBalance,
      recentInvoicesList,
      recentPaymentsList,
      overdueInvoicesData,
      monthlyRevenueTrend,
    ] = await Promise.all([
      this.getTotalRevenue(tenantId),
      this.getTotalExpenses(tenantId),
      this.getAccountsReceivable(tenantId),
      this.getAccountsPayable(tenantId),
      this.getCashBalance(tenantId),
      this.getRecentInvoices(tenantId),
      this.getRecentPayments(tenantId),
      this.getOverdueInvoices(tenantId),
      this.getMonthlyRevenueTrend(tenantId),
    ]);

    return {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      accountsReceivable,
      accountsPayable,
      cashBalance,
      recentInvoices: recentInvoicesList,
      recentPayments: recentPaymentsList,
      overdueInvoices: overdueInvoicesData,
      monthlyRevenueTrend,
    };
  }

  private async getTotalRevenue(tenantId: string): Promise<number> {
    const result = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${journalLines.creditAmount} AS numeric) - CAST(${journalLines.debitAmount} AS numeric)), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(
        and(
          eq(journalLines.tenantId, tenantId),
          eq(journalEntries.status, 'posted'),
          eq(accounts.accountType, 'revenue'),
        ),
      );

    return parseFloat(result[0]?.total || '0');
  }

  private async getTotalExpenses(tenantId: string): Promise<number> {
    const result = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${journalLines.debitAmount} AS numeric) - CAST(${journalLines.creditAmount} AS numeric)), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(
        and(
          eq(journalLines.tenantId, tenantId),
          eq(journalEntries.status, 'posted'),
          eq(accounts.accountType, 'expense'),
        ),
      );

    return parseFloat(result[0]?.total || '0');
  }

  private async getAccountsReceivable(tenantId: string): Promise<number> {
    // Sum balance due of all non-void/cancelled invoices
    const result = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${invoices.balanceDue} AS numeric)), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          sql`${invoices.status} NOT IN ('void', 'cancelled', 'draft')`,
        ),
      );

    return parseFloat(result[0]?.total || '0');
  }

  private async getAccountsPayable(tenantId: string): Promise<number> {
    // Sum balance from AP account (code 2100)
    const result = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${journalLines.creditAmount} AS numeric) - CAST(${journalLines.debitAmount} AS numeric)), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(
        and(
          eq(journalLines.tenantId, tenantId),
          eq(journalEntries.status, 'posted'),
          eq(accounts.accountType, 'liability'),
          sql`${accounts.code} IN ('2100', '2000')`,
        ),
      );

    return parseFloat(result[0]?.total || '0');
  }

  private async getCashBalance(tenantId: string): Promise<number> {
    // Sum of cash/bank account balances
    const result = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${journalLines.debitAmount} AS numeric) - CAST(${journalLines.creditAmount} AS numeric)), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(
        and(
          eq(journalLines.tenantId, tenantId),
          eq(journalEntries.status, 'posted'),
          sql`${accounts.code} IN ('1010', '1020', '1100', '1200')`,
        ),
      );

    return parseFloat(result[0]?.total || '0');
  }

  private async getRecentInvoices(tenantId: string) {
    return this.db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        status: invoices.status,
        total: invoices.total,
        balanceDue: invoices.balanceDue,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
      })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(desc(invoices.createdAt))
      .limit(10);
  }

  private async getRecentPayments(tenantId: string) {
    return this.db
      .select({
        id: payments.id,
        paymentNumber: payments.paymentNumber,
        type: payments.type,
        amount: payments.amount,
        status: payments.status,
        date: payments.date,
        paymentMethod: payments.paymentMethod,
      })
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.createdAt))
      .limit(10);
  }

  private async getOverdueInvoices(tenantId: string) {
    const today = new Date().toISOString().split('T')[0];

    const result = await this.db
      .select({
        count: sql<string>`COUNT(*)`,
        total: sql<string>`COALESCE(SUM(CAST(${invoices.balanceDue} AS numeric)), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          lt(invoices.dueDate, today),
          sql`${invoices.status} NOT IN ('paid', 'void', 'cancelled', 'draft')`,
          sql`CAST(${invoices.balanceDue} AS numeric) > 0`,
        ),
      );

    return {
      count: parseInt(result[0]?.count || '0'),
      totalAmount: parseFloat(result[0]?.total || '0'),
    };
  }

  private async getMonthlyRevenueTrend(tenantId: string) {
    const result = await this.db
      .select({
        month: sql<string>`TO_CHAR(${journalEntries.date}::date, 'YYYY-MM')`,
        amount: sql<string>`COALESCE(SUM(CAST(${journalLines.creditAmount} AS numeric) - CAST(${journalLines.debitAmount} AS numeric)), 0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(
        and(
          eq(journalLines.tenantId, tenantId),
          eq(journalEntries.status, 'posted'),
          eq(accounts.accountType, 'revenue'),
          sql`${journalEntries.date}::date >= CURRENT_DATE - INTERVAL '12 months'`,
        ),
      )
      .groupBy(sql`TO_CHAR(${journalEntries.date}::date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${journalEntries.date}::date, 'YYYY-MM')`);

    return result.map((r) => ({
      month: r.month,
      revenue: parseFloat(r.amount),
    }));
  }
}
