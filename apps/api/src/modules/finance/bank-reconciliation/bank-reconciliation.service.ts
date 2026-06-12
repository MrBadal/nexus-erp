import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  bankAccounts,
  bankTransactions,
  journalLines,
  journalEntries,
  accounts,
} from '../../../database/schema/index.js';

interface CreateBankAccountDto {
  name: string;
  accountId: string;
  bankName?: string;
  accountNumberLast4?: string;
  currencyCode?: string;
}

interface ImportBankTransactionDto {
  bankAccountId: string;
  date: string;
  description?: string;
  amount: string;
  reference?: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest' | 'adjustment';
}

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ─── Bank Accounts ─────────────────────────────────────────────

  async listBankAccounts(tenantId: string) {
    return this.db
      .select({
        id: bankAccounts.id,
        name: bankAccounts.name,
        accountId: bankAccounts.accountId,
        bankName: bankAccounts.bankName,
        accountNumberLast4: bankAccounts.accountNumberLast4,
        currencyCode: bankAccounts.currencyCode,
        currentBalance: bankAccounts.currentBalance,
        isDefault: bankAccounts.isDefault,
        isActive: bankAccounts.isActive,
      })
      .from(bankAccounts)
      .where(eq(bankAccounts.tenantId, tenantId))
      .orderBy(desc(bankAccounts.createdAt));
  }

  async createBankAccount(tenantId: string, data: CreateBankAccountDto) {
    // Verify the GL account exists and is a bank/cash type
    const [acct] = await this.db
      .select({ id: accounts.id, code: accounts.code })
      .from(accounts)
      .where(and(eq(accounts.id, data.accountId), eq(accounts.tenantId, tenantId)))
      .limit(1);

    if (!acct) {
      throw new BadRequestException('GL account not found');
    }

    const [bankAccount] = await this.db
      .insert(bankAccounts)
      .values({
        tenantId,
        name: data.name,
        accountId: data.accountId,
        bankName: data.bankName || null,
        accountNumberLast4: data.accountNumberLast4 || null,
        currencyCode: data.currencyCode || 'INR',
      })
      .returning();

    return bankAccount;
  }

  // ─── Bank Transactions ─────────────────────────────────────────

  async listTransactions(
    tenantId: string,
    bankAccountId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ) {
    const conditions = [
      eq(bankTransactions.tenantId, tenantId),
      eq(bankTransactions.bankAccountId, bankAccountId),
    ];

    if (options?.status) {
      conditions.push(
        eq(bankTransactions.status, options.status as 'unmatched' | 'matched' | 'reconciled' | 'excluded'),
      );
    }

    return this.db
      .select()
      .from(bankTransactions)
      .where(and(...conditions))
      .orderBy(desc(bankTransactions.date))
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);
  }

  async importTransactions(tenantId: string, transactions: ImportBankTransactionDto[]) {
    if (!transactions.length) {
      throw new BadRequestException('No transactions to import');
    }

    const results = await this.db
      .insert(bankTransactions)
      .values(
        transactions.map((txn) => ({
          tenantId,
          bankAccountId: txn.bankAccountId,
          date: txn.date,
          description: txn.description || null,
          amount: txn.amount,
          reference: txn.reference || null,
          type: txn.type,
          status: 'unmatched' as const,
          importSource: 'manual' as const,
        })),
      )
      .returning();

    this.logger.log(`Imported ${results.length} bank transactions`);
    return results;
  }

  // ─── Matching ──────────────────────────────────────────────────

  async matchTransaction(
    tenantId: string,
    transactionId: string,
    journalLineId: string,
  ) {
    // Verify bank transaction exists and is unmatched
    const [txn] = await this.db
      .select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.id, transactionId),
          eq(bankTransactions.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!txn) {
      throw new NotFoundException('Bank transaction not found');
    }

    if (txn.status !== 'unmatched') {
      throw new BadRequestException(`Transaction is already ${txn.status}`);
    }

    // Verify journal line exists
    const [line] = await this.db
      .select()
      .from(journalLines)
      .where(
        and(
          eq(journalLines.id, journalLineId),
          eq(journalLines.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!line) {
      throw new NotFoundException('Journal line not found');
    }

    // Update bank transaction with match
    const [updated] = await this.db
      .update(bankTransactions)
      .set({
        status: 'matched',
        matchedJournalLineId: journalLineId,
        matchedBy: 'manual',
      })
      .where(eq(bankTransactions.id, transactionId))
      .returning();

    return updated;
  }

  async reconcileMatched(tenantId: string, bankAccountId: string) {
    // Move all 'matched' transactions to 'reconciled' and mark journal lines as reconciled
    const matchedTxns = await this.db
      .select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.tenantId, tenantId),
          eq(bankTransactions.bankAccountId, bankAccountId),
          eq(bankTransactions.status, 'matched'),
        ),
      );

    if (!matchedTxns.length) {
      throw new BadRequestException('No matched transactions to reconcile');
    }

    let reconciledCount = 0;

    for (const txn of matchedTxns) {
      // Mark transaction as reconciled
      await this.db
        .update(bankTransactions)
        .set({ status: 'reconciled' })
        .where(eq(bankTransactions.id, txn.id));

      // Mark the corresponding journal line as reconciled
      if (txn.matchedJournalLineId) {
        await this.db
          .update(journalLines)
          .set({
            reconciled: true,
            reconciledAt: new Date(),
          })
          .where(eq(journalLines.id, txn.matchedJournalLineId));
      }

      reconciledCount++;
    }

    this.logger.log(`Reconciled ${reconciledCount} transactions for bank account ${bankAccountId}`);
    return { reconciledCount };
  }

  async excludeTransaction(tenantId: string, transactionId: string) {
    const [updated] = await this.db
      .update(bankTransactions)
      .set({ status: 'excluded' })
      .where(
        and(
          eq(bankTransactions.id, transactionId),
          eq(bankTransactions.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundException('Bank transaction not found');
    }

    return updated;
  }

  // ─── Auto-matching ─────────────────────────────────────────────

  async autoMatch(tenantId: string, bankAccountId: string) {
    // Get the GL account linked to this bank account
    const [bankAcct] = await this.db
      .select({ accountId: bankAccounts.accountId })
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, bankAccountId),
          eq(bankAccounts.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!bankAcct) {
      throw new NotFoundException('Bank account not found');
    }

    // Get unmatched bank transactions
    const unmatchedTxns = await this.db
      .select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.tenantId, tenantId),
          eq(bankTransactions.bankAccountId, bankAccountId),
          eq(bankTransactions.status, 'unmatched'),
        ),
      );

    let matchCount = 0;

    for (const txn of unmatchedTxns) {
      const txnAmount = parseFloat(txn.amount);

      // Try to find an unreconciled journal line on the same account with matching amount and date
      // Withdrawals match credit entries (money going out), deposits match debit entries (money coming in)
      const isOutflow = txn.type === 'withdrawal' || txn.type === 'fee';
      const debitOrCredit = isOutflow
        ? sql`CAST(${journalLines.creditAmount} AS numeric) = ${Math.abs(txnAmount)}`
        : sql`CAST(${journalLines.debitAmount} AS numeric) = ${Math.abs(txnAmount)}`;

      const [matchLine] = await this.db
        .select({ id: journalLines.id })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(
          and(
            eq(journalLines.tenantId, tenantId),
            eq(journalLines.accountId, bankAcct.accountId),
            eq(journalLines.reconciled, false),
            eq(journalEntries.status, 'posted'),
            eq(journalEntries.date, txn.date),
            debitOrCredit,
          ),
        )
        .limit(1);

      if (matchLine) {
        await this.db
          .update(bankTransactions)
          .set({
            status: 'matched',
            matchedJournalLineId: matchLine.id,
            matchedBy: 'auto',
          })
          .where(eq(bankTransactions.id, txn.id));

        matchCount++;
      }
    }

    this.logger.log(`Auto-matched ${matchCount} of ${unmatchedTxns.length} transactions`);
    return { matchCount, totalUnmatched: unmatchedTxns.length };
  }

  // ─── Reconciliation Summary ────────────────────────────────────

  async getReconciliationSummary(tenantId: string, bankAccountId: string) {
    const [bankAcct] = await this.db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, bankAccountId),
          eq(bankAccounts.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!bankAcct) {
      throw new NotFoundException('Bank account not found');
    }

    const [counts] = await this.db
      .select({
        total: sql<string>`COUNT(*)`,
        unmatched: sql<string>`COUNT(*) FILTER (WHERE ${bankTransactions.status} = 'unmatched')`,
        matched: sql<string>`COUNT(*) FILTER (WHERE ${bankTransactions.status} = 'matched')`,
        reconciled: sql<string>`COUNT(*) FILTER (WHERE ${bankTransactions.status} = 'reconciled')`,
        excluded: sql<string>`COUNT(*) FILTER (WHERE ${bankTransactions.status} = 'excluded')`,
        unmatchedAmount: sql<string>`COALESCE(SUM(CAST(${bankTransactions.amount} AS numeric)) FILTER (WHERE ${bankTransactions.status} = 'unmatched'), 0)`,
      })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.tenantId, tenantId),
          eq(bankTransactions.bankAccountId, bankAccountId),
        ),
      );

    return {
      bankAccount: bankAcct,
      total: parseInt(counts?.total || '0'),
      unmatched: parseInt(counts?.unmatched || '0'),
      matched: parseInt(counts?.matched || '0'),
      reconciled: parseInt(counts?.reconciled || '0'),
      excluded: parseInt(counts?.excluded || '0'),
      unmatchedAmount: parseFloat(counts?.unmatchedAmount || '0'),
    };
  }
}
