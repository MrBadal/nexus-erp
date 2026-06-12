import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BankReconciliationService } from './bank-reconciliation.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';

@ApiTags('bank-reconciliation')
@ApiBearerAuth()
@Controller('finance/bank-reconciliation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BankReconciliationController {
  private readonly logger = new Logger(BankReconciliationController.name);

  constructor(private readonly service: BankReconciliationService) {}

  // ─── Bank Accounts ─────────────────────────────────────────────

  @Get('accounts')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'List bank accounts' })
  async listBankAccounts(@CurrentTenant() tenantId: string) {
    return this.service.listBankAccounts(tenantId);
  }

  @Post('accounts')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Create a bank account' })
  async createBankAccount(
    @CurrentTenant() tenantId: string,
    @Body() data: { name: string; accountId: string; bankName?: string; accountNumberLast4?: string; currencyCode?: string },
  ) {
    return this.service.createBankAccount(tenantId, data);
  }

  // ─── Transactions ──────────────────────────────────────────────

  @Get('accounts/:bankAccountId/transactions')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'List bank transactions for an account' })
  async listTransactions(
    @CurrentTenant() tenantId: string,
    @Param('bankAccountId') bankAccountId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.listTransactions(tenantId, bankAccountId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Post('transactions/import')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Import bank transactions (CSV/manual)' })
  async importTransactions(
    @CurrentTenant() tenantId: string,
    @Body() data: { transactions: { bankAccountId: string; date: string; description?: string; amount: string; reference?: string; type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest' | 'adjustment' }[] },
  ) {
    return this.service.importTransactions(tenantId, data.transactions);
  }

  // ─── Matching ──────────────────────────────────────────────────

  @Post('transactions/:id/match')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Manually match a bank transaction to a journal line' })
  async matchTransaction(
    @CurrentTenant() tenantId: string,
    @Param('id') transactionId: string,
    @Body() data: { journalLineId: string },
  ) {
    return this.service.matchTransaction(tenantId, transactionId, data.journalLineId);
  }

  @Post('accounts/:bankAccountId/auto-match')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Auto-match unmatched transactions by amount and date' })
  async autoMatch(
    @CurrentTenant() tenantId: string,
    @Param('bankAccountId') bankAccountId: string,
  ) {
    return this.service.autoMatch(tenantId, bankAccountId);
  }

  @Post('accounts/:bankAccountId/reconcile')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Reconcile all matched transactions' })
  async reconcileMatched(
    @CurrentTenant() tenantId: string,
    @Param('bankAccountId') bankAccountId: string,
  ) {
    return this.service.reconcileMatched(tenantId, bankAccountId);
  }

  @Put('transactions/:id/exclude')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Exclude a transaction from reconciliation' })
  async excludeTransaction(
    @CurrentTenant() tenantId: string,
    @Param('id') transactionId: string,
  ) {
    return this.service.excludeTransaction(tenantId, transactionId);
  }

  // ─── CSV Import ────────────────────────────────────────────────

  @Post('accounts/:bankAccountId/import-csv')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Import bank transactions from CSV text (Indian bank statement format)' })
  async importCsv(
    @CurrentTenant() tenantId: string,
    @Param('bankAccountId') bankAccountId: string,
    @Body() body: { csvContent: string; dateFormat?: string },
  ) {
    const rows = this.parseBankCsv(body.csvContent, body.dateFormat);

    if (rows.length === 0) {
      return { imported: 0, message: 'No valid transactions found in CSV' };
    }

    const transactions = rows.map((row) => ({
      bankAccountId,
      date: row.date,
      description: row.description,
      amount: row.amount,
      reference: row.reference || undefined,
      type: (parseFloat(row.amount) >= 0 ? 'deposit' : 'withdrawal') as 'deposit' | 'withdrawal',
    }));

    await this.service.importTransactions(tenantId, transactions);

    return {
      imported: transactions.length,
      deposits: transactions.filter((t) => t.type === 'deposit').length,
      withdrawals: transactions.filter((t) => t.type === 'withdrawal').length,
    };
  }

  /**
   * Parse CSV text from Indian bank statements.
   * Supports common formats:
   * - Date, Description, Withdrawal, Deposit, Balance
   * - Date, Narration, Debit, Credit, Balance
   * - Date, Description, Amount, Balance (negative = withdrawal)
   */
  private parseBankCsv(
    csvContent: string,
    dateFormat?: string,
  ): { date: string; description: string; amount: string; reference?: string }[] {
    const lines = csvContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    // Detect header columns
    const header = lines[0].toLowerCase();
    const separator = header.includes('\t') ? '\t' : ',';
    const headerCols = this.splitCsvLine(lines[0], separator).map((h) => h.toLowerCase().trim());

    // Map column indices
    const dateIdx = headerCols.findIndex((h) => h.includes('date') || h.includes('txn date') || h.includes('value date'));
    const descIdx = headerCols.findIndex((h) => h.includes('description') || h.includes('narration') || h.includes('particular') || h.includes('remark'));
    const withdrawalIdx = headerCols.findIndex((h) => h.includes('withdrawal') || h.includes('debit') || h.includes('dr'));
    const depositIdx = headerCols.findIndex((h) => h.includes('deposit') || h.includes('credit') || h.includes('cr'));
    const amountIdx = headerCols.findIndex((h) => h === 'amount' || h.includes('transaction amount'));
    const refIdx = headerCols.findIndex((h) => h.includes('reference') || h.includes('ref') || h.includes('chq') || h.includes('cheque'));

    if (dateIdx === -1 || (descIdx === -1 && amountIdx === -1 && withdrawalIdx === -1)) {
      this.logger.warn('Could not detect CSV column mapping from headers');
      return [];
    }

    const results: { date: string; description: string; amount: string; reference?: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCsvLine(lines[i], separator);
      if (cols.length < 3) continue;

      const rawDate = cols[dateIdx]?.trim();
      if (!rawDate) continue;

      const date = this.parseIndianDate(rawDate, dateFormat);
      if (!date) continue;

      const description = cols[descIdx]?.trim() || '';

      let amount: number;
      if (withdrawalIdx !== -1 && depositIdx !== -1) {
        // Separate withdrawal/deposit columns
        const withdrawal = this.parseAmount(cols[withdrawalIdx]);
        const deposit = this.parseAmount(cols[depositIdx]);
        amount = deposit > 0 ? deposit : -withdrawal;
      } else if (amountIdx !== -1) {
        amount = this.parseAmount(cols[amountIdx]);
      } else {
        continue;
      }

      if (amount === 0) continue;

      results.push({
        date,
        description,
        amount: amount.toFixed(4),
        reference: refIdx !== -1 ? cols[refIdx]?.trim() : undefined,
      });
    }

    return results;
  }

  private splitCsvLine(line: string, separator: string): string[] {
    if (separator === '\t') return line.split('\t');

    // Handle quoted CSV fields
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private parseAmount(value: string | undefined): number {
    if (!value) return 0;
    // Remove currency symbols, commas, spaces
    const cleaned = value.replace(/[₹$,\s]/g, '').trim();
    if (!cleaned || cleaned === '-' || cleaned === '') return 0;
    return parseFloat(cleaned) || 0;
  }

  private parseIndianDate(dateStr: string, format?: string): string | null {
    // Support DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY
    const cleaned = dateStr.replace(/['"]/g, '').trim();

    if (format === 'MM/DD/YYYY') {
      const match = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
      if (match) return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    }

    // ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
      return cleaned.substring(0, 10);
    }

    // DD/MM/YYYY or DD-MM-YYYY (most common in India)
    const ddmmyyyy = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }

    return null;
  }

  // ─── Summary ───────────────────────────────────────────────────

  @Get('accounts/:bankAccountId/summary')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Get reconciliation summary for a bank account' })
  async getSummary(
    @CurrentTenant() tenantId: string,
    @Param('bankAccountId') bankAccountId: string,
  ) {
    return this.service.getReconciliationSummary(tenantId, bankAccountId);
  }
}
