import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  journalEntries,
  journalLines,
  accounts,
  fiscalPeriods,
  type NewJournalEntry,
  type NewJournalLine,
} from '../../../database/schema/index.js';

interface CreateJournalEntryDto {
  date: string;
  reference?: string;
  description?: string;
  sourceType?: string;
  sourceId?: string;
  currencyCode?: string;
  exchangeRate?: string;
  fiscalPeriodId?: string;
  tags?: string[];
  lines: {
    accountId: string;
    description?: string;
    debitAmount: string;
    creditAmount: string;
    departmentId?: string;
    projectId?: string;
    contactId?: string;
    taxRateId?: string;
    taxAmount?: string;
  }[];
}

@Injectable()
export class JournalEntryService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(tenantId: string, options?: { status?: string; limit?: number; offset?: number }) {
    const conditions = [eq(journalEntries.tenantId, tenantId)];

    if (options?.status) {
      conditions.push(eq(journalEntries.status, options.status as any));
    }

    return this.db
      .select()
      .from(journalEntries)
      .where(and(...conditions))
      .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [entry] = await this.db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, id), eq(journalEntries.tenantId, tenantId)))
      .limit(1);

    if (!entry) {
      throw new NotFoundException(`Journal entry with ID "${id}" not found`);
    }

    const lines = await this.db
      .select({
        id: journalLines.id,
        lineNumber: journalLines.lineNumber,
        accountId: journalLines.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        description: journalLines.description,
        debitAmount: journalLines.debitAmount,
        creditAmount: journalLines.creditAmount,
        baseDebitAmount: journalLines.baseDebitAmount,
        baseCreditAmount: journalLines.baseCreditAmount,
        departmentId: journalLines.departmentId,
        projectId: journalLines.projectId,
        contactId: journalLines.contactId,
        taxRateId: journalLines.taxRateId,
        taxAmount: journalLines.taxAmount,
        reconciled: journalLines.reconciled,
      })
      .from(journalLines)
      .leftJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(eq(journalLines.journalEntryId, id))
      .orderBy(journalLines.lineNumber);

    return { ...entry, lines };
  }

  async create(tenantId: string, userId: string, data: CreateJournalEntryDto) {
    // Validation
    this.validateLines(data.lines);

    // Generate entry number
    const entryNumber = await this.generateEntryNumber(tenantId);

    // Calculate totals
    const totalDebit = data.lines.reduce(
      (sum, line) => sum + parseFloat(line.debitAmount || '0'),
      0,
    );
    const totalCredit = data.lines.reduce(
      (sum, line) => sum + parseFloat(line.creditAmount || '0'),
      0,
    );

    const exchangeRate = parseFloat(data.exchangeRate || '1');

    // Atomic: entry header + lines must commit together
    const entry = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(journalEntries)
        .values({
          tenantId,
          entryNumber,
          date: data.date,
          reference: data.reference || null,
          description: data.description || null,
          sourceType: (data.sourceType as any) || 'manual',
          sourceId: data.sourceId || null,
          currencyCode: data.currencyCode || 'USD',
          exchangeRate: data.exchangeRate || '1',
          fiscalPeriodId: data.fiscalPeriodId || null,
          totalDebit: totalDebit.toFixed(4),
          totalCredit: totalCredit.toFixed(4),
          tags: data.tags || null,
          createdBy: userId,
          status: 'draft',
        })
        .returning();

      // Insert lines
      const lineValues = data.lines.map((line, index) => ({
        tenantId,
        journalEntryId: created.id,
        lineNumber: index + 1,
        accountId: line.accountId,
        description: line.description || null,
        debitAmount: line.debitAmount || '0',
        creditAmount: line.creditAmount || '0',
        baseDebitAmount: (parseFloat(line.debitAmount || '0') * exchangeRate).toFixed(4),
        baseCreditAmount: (parseFloat(line.creditAmount || '0') * exchangeRate).toFixed(4),
        departmentId: line.departmentId || null,
        projectId: line.projectId || null,
        contactId: line.contactId || null,
        taxRateId: line.taxRateId || null,
        taxAmount: line.taxAmount || null,
      }));

      await tx.insert(journalLines).values(lineValues);

      return created;
    });

    return this.findById(tenantId, entry.id);
  }

  async post(tenantId: string, id: string, userId: string) {
    const entry = await this.findById(tenantId, id);

    if (entry.status !== 'draft') {
      throw new BadRequestException(
        `Cannot post journal entry with status "${entry.status}". Only draft entries can be posted.`,
      );
    }

    // Re-validate balance
    const totalDebit = parseFloat(entry.totalDebit);
    const totalCredit = parseFloat(entry.totalCredit);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }

    // Validate fiscal period is open
    if (entry.fiscalPeriodId) {
      const [period] = await this.db
        .select()
        .from(fiscalPeriods)
        .where(eq(fiscalPeriods.id, entry.fiscalPeriodId))
        .limit(1);

      if (period && period.status !== 'open') {
        throw new BadRequestException('Cannot post to a closed or locked fiscal period');
      }
    }

    // Atomic: status flip + all account balance updates commit together
    await this.db.transaction(async (tx) => {
      // Post the entry
      await tx
        .update(journalEntries)
        .set({
          status: 'posted',
          postedDate: new Date().toISOString().split('T')[0],
          approvedBy: userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(journalEntries.id, id));

      // Update account balances
      for (const line of entry.lines) {
        const debit = parseFloat(line.debitAmount || '0');
        const credit = parseFloat(line.creditAmount || '0');

        if (debit > 0 || credit > 0) {
          // Get account to determine normal balance
          const [account] = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, line.accountId))
            .limit(1);

          if (account) {
            let balanceChange: number;
            if (account.normalBalance === 'debit') {
              balanceChange = debit - credit;
            } else {
              balanceChange = credit - debit;
            }

            await tx
              .update(accounts)
              .set({
                currentBalance: sql`${accounts.currentBalance} + ${balanceChange}`,
                updatedAt: new Date(),
              })
              .where(eq(accounts.id, line.accountId));
          }
        }
      }
    });

    this.eventEmitter.emit('journal.posted', {
      entryId: id,
      tenantId,
      userId,
    });

    return this.findById(tenantId, id);
  }

  async reverse(tenantId: string, id: string, userId: string, date?: string) {
    const entry = await this.findById(tenantId, id);

    if (entry.status !== 'posted') {
      throw new BadRequestException('Only posted entries can be reversed');
    }

    if (entry.isReversing) {
      throw new BadRequestException('Reversing entries cannot be reversed');
    }

    // Create reversing entry with swapped debits/credits
    const reversingEntryNumber = await this.generateEntryNumber(tenantId);
    const reversingDate = date || new Date().toISOString().split('T')[0];

    // Atomic: reversing entry + lines + original status flip commit together
    const reversingEntry = await this.db.transaction(async (tx) => {
      const [reversing] = await tx
        .insert(journalEntries)
        .values({
          tenantId,
          entryNumber: reversingEntryNumber,
          date: reversingDate,
          reference: `Reversal of ${entry.entryNumber}`,
          description: `Reversal: ${entry.description || entry.entryNumber}`,
          sourceType: entry.sourceType as any,
          sourceId: entry.sourceId,
          status: 'draft',
          isReversing: true,
          reversesId: entry.id,
          fiscalPeriodId: entry.fiscalPeriodId,
          currencyCode: entry.currencyCode,
          exchangeRate: entry.exchangeRate,
          totalDebit: entry.totalCredit,
          totalCredit: entry.totalDebit,
          createdBy: userId,
        })
        .returning();

      // Create reversed lines (swap debit/credit)
      const reversedLines = entry.lines.map((line, index) => ({
        tenantId,
        journalEntryId: reversing.id,
        lineNumber: index + 1,
        accountId: line.accountId,
        description: `Reversal: ${line.description || ''}`,
        debitAmount: line.creditAmount || '0',
        creditAmount: line.debitAmount || '0',
        baseDebitAmount: line.baseCreditAmount || '0',
        baseCreditAmount: line.baseDebitAmount || '0',
        departmentId: line.departmentId,
        projectId: line.projectId,
        contactId: line.contactId,
        taxRateId: line.taxRateId,
        taxAmount: line.taxAmount,
      }));

      await tx.insert(journalLines).values(reversedLines);

      // Mark original as reversed
      await tx
        .update(journalEntries)
        .set({
          status: 'reversed',
          reversedById: reversing.id,
          updatedAt: new Date(),
        })
        .where(eq(journalEntries.id, id));

      return reversing;
    });

    this.eventEmitter.emit('journal.reversed', {
      originalEntryId: id,
      reversingEntryId: reversingEntry.id,
      tenantId,
      userId,
    });

    return this.findById(tenantId, reversingEntry.id);
  }

  async update(tenantId: string, id: string, data: Partial<CreateJournalEntryDto>) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft entries can be modified');
    }

    const updateData: any = { updatedAt: new Date() };
    if (data.date) updateData.date = data.date;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.tags) updateData.tags = data.tags;

    if (data.lines) {
      this.validateLines(data.lines);

      const totalDebit = data.lines.reduce(
        (sum, line) => sum + parseFloat(line.debitAmount || '0'),
        0,
      );
      const totalCredit = data.lines.reduce(
        (sum, line) => sum + parseFloat(line.creditAmount || '0'),
        0,
      );

      updateData.totalDebit = totalDebit.toFixed(4);
      updateData.totalCredit = totalCredit.toFixed(4);

      const exchangeRate = parseFloat(data.exchangeRate || existing.exchangeRate || '1');

      const lineValues = data.lines.map((line, index) => ({
        tenantId,
        journalEntryId: id,
        lineNumber: index + 1,
        accountId: line.accountId,
        description: line.description || null,
        debitAmount: line.debitAmount || '0',
        creditAmount: line.creditAmount || '0',
        baseDebitAmount: (parseFloat(line.debitAmount || '0') * exchangeRate).toFixed(4),
        baseCreditAmount: (parseFloat(line.creditAmount || '0') * exchangeRate).toFixed(4),
        departmentId: line.departmentId || null,
        projectId: line.projectId || null,
        contactId: line.contactId || null,
        taxRateId: line.taxRateId || null,
        taxAmount: line.taxAmount || null,
      }));

      // Atomic: delete + reinsert lines + header update commit together
      await this.db.transaction(async (tx) => {
        await tx
          .delete(journalLines)
          .where(eq(journalLines.journalEntryId, id));
        await tx.insert(journalLines).values(lineValues);
        await tx
          .update(journalEntries)
          .set(updateData)
          .where(eq(journalEntries.id, id));
      });
    } else {
      await this.db
        .update(journalEntries)
        .set(updateData)
        .where(eq(journalEntries.id, id));
    }

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft entries can be deleted');
    }

    // Atomic: lines + entry deletion commit together
    await this.db.transaction(async (tx) => {
      await tx.delete(journalLines).where(eq(journalLines.journalEntryId, id));
      await tx.delete(journalEntries).where(eq(journalEntries.id, id));
    });

    return { message: 'Journal entry deleted successfully' };
  }

  private validateLines(
    lines: CreateJournalEntryDto['lines'],
  ) {
    if (!lines || lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines');
    }

    const totalDebit = lines.reduce(
      (sum, line) => sum + parseFloat(line.debitAmount || '0'),
      0,
    );
    const totalCredit = lines.reduce(
      (sum, line) => sum + parseFloat(line.creditAmount || '0'),
      0,
    );

    // Check balance (allow for tiny floating point differences)
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException(
        `Journal entry must be balanced. Total debits (${totalDebit.toFixed(4)}) must equal total credits (${totalCredit.toFixed(4)})`,
      );
    }

    if (totalDebit === 0 && totalCredit === 0) {
      throw new BadRequestException('Journal entry cannot have all zero amounts');
    }

    // Validate each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const debit = parseFloat(line.debitAmount || '0');
      const credit = parseFloat(line.creditAmount || '0');

      if (debit < 0 || credit < 0) {
        throw new BadRequestException(
          `Line ${i + 1}: Debit and credit amounts cannot be negative`,
        );
      }

      if (debit === 0 && credit === 0) {
        throw new BadRequestException(
          `Line ${i + 1}: Each line must have either a debit or credit amount`,
        );
      }

      if (debit > 0 && credit > 0) {
        throw new BadRequestException(
          `Line ${i + 1}: A line cannot have both a debit and credit amount`,
        );
      }

      if (!line.accountId) {
        throw new BadRequestException(`Line ${i + 1}: Account ID is required`);
      }
    }
  }

  private async generateEntryNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JE-${year}-`;

    const [latest] = await this.db
      .select({ entryNumber: journalEntries.entryNumber })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          sql`${journalEntries.entryNumber} LIKE ${prefix + '%'}`,
        ),
      )
      .orderBy(desc(journalEntries.entryNumber))
      .limit(1);

    let nextNum = 1;
    if (latest) {
      const currentNum = parseInt(latest.entryNumber.replace(prefix, ''), 10);
      if (!isNaN(currentNum)) {
        nextNum = currentNum + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(6, '0')}`;
  }
}
