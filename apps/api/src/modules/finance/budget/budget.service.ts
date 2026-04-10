import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq, and, isNull, desc, sql, between } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  budgets,
  budgetLines,
  accounts,
  journalLines,
  journalEntries,
} from '../../../database/schema/index.js';
import { NotificationService } from '../../shared/notification.service.js';

export interface CreateBudgetDto {
  name: string;
  fiscalYear: string;
  fromDate: string;
  toDate: string;
  notes?: string;
  lines: {
    accountId: string;
    budgetedAmount: string;
    month?: number;
    notes?: string;
  }[];
}

export interface UpdateBudgetDto {
  name?: string;
  notes?: string;
  lines?: {
    accountId: string;
    budgetedAmount: string;
    month?: number;
    notes?: string;
  }[];
}

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly notificationService: NotificationService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      fiscalYear?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(budgets.tenantId, tenantId),
      isNull(budgets.deletedAt),
    ];

    if (options?.status) {
      conditions.push(eq(budgets.status, options.status as 'draft' | 'active' | 'closed'));
    }

    if (options?.fiscalYear) {
      conditions.push(eq(budgets.fiscalYear, options.fiscalYear));
    }

    return this.db
      .select()
      .from(budgets)
      .where(and(...conditions))
      .orderBy(desc(budgets.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [budget] = await this.db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.id, id),
          eq(budgets.tenantId, tenantId),
          isNull(budgets.deletedAt),
        ),
      )
      .limit(1);

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    const lines = await this.db
      .select({
        id: budgetLines.id,
        accountId: budgetLines.accountId,
        budgetedAmount: budgetLines.budgetedAmount,
        actualAmount: budgetLines.actualAmount,
        month: budgetLines.month,
        notes: budgetLines.notes,
        accountCode: accounts.code,
        accountName: accounts.name,
      })
      .from(budgetLines)
      .leftJoin(accounts, eq(accounts.id, budgetLines.accountId))
      .where(eq(budgetLines.budgetId, id));

    return { ...budget, lines };
  }

  async create(tenantId: string, userId: string, dto: CreateBudgetDto) {
    const totalBudgeted = dto.lines.reduce(
      (sum, line) => sum + parseFloat(line.budgetedAmount),
      0,
    );

    const [budget] = await this.db
      .insert(budgets)
      .values({
        tenantId,
        name: dto.name,
        fiscalYear: dto.fiscalYear,
        fromDate: dto.fromDate,
        toDate: dto.toDate,
        totalBudgeted: totalBudgeted.toFixed(4),
        notes: dto.notes || null,
        createdBy: userId,
      })
      .returning();

    if (dto.lines?.length) {
      await this.db.insert(budgetLines).values(
        dto.lines.map((line) => ({
          budgetId: budget.id,
          accountId: line.accountId,
          budgetedAmount: line.budgetedAmount,
          month: line.month ?? null,
          notes: line.notes || null,
        })),
      );
    }

    return this.findById(tenantId, budget.id);
  }

  async update(tenantId: string, id: string, dto: UpdateBudgetDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft budgets can be updated');
    }

    if (dto.name || dto.notes !== undefined) {
      await this.db
        .update(budgets)
        .set({
          name: dto.name ?? existing.name,
          notes: dto.notes ?? existing.notes,
          updatedAt: new Date(),
        })
        .where(eq(budgets.id, id));
    }

    if (dto.lines) {
      await this.db
        .delete(budgetLines)
        .where(eq(budgetLines.budgetId, id));

      const totalBudgeted = dto.lines.reduce(
        (sum, line) => sum + parseFloat(line.budgetedAmount),
        0,
      );

      await this.db
        .update(budgets)
        .set({ totalBudgeted: totalBudgeted.toFixed(4) })
        .where(eq(budgets.id, id));

      if (dto.lines.length) {
        await this.db.insert(budgetLines).values(
          dto.lines.map((line) => ({
            budgetId: id,
            accountId: line.accountId,
            budgetedAmount: line.budgetedAmount,
            month: line.month ?? null,
            notes: line.notes || null,
          })),
        );
      }
    }

    return this.findById(tenantId, id);
  }

  async activate(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft budgets can be activated');
    }

    await this.db
      .update(budgets)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(budgets.id, id));

    return this.findById(tenantId, id);
  }

  async close(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'active') {
      throw new BadRequestException('Only active budgets can be closed');
    }

    await this.db
      .update(budgets)
      .set({ status: 'closed', updatedAt: new Date() })
      .where(eq(budgets.id, id));

    return this.findById(tenantId, id);
  }

  async refreshActuals(tenantId: string, id: string) {
    const budget = await this.findById(tenantId, id);

    let totalActual = 0;

    for (const line of budget.lines) {
      // Sum actual amounts from posted journal entries within the budget period
      const [result] = await this.db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${journalLines.debitAmount} AS numeric)), 0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
        .where(
          and(
            eq(journalLines.accountId, line.accountId),
            eq(journalEntries.tenantId, tenantId),
            eq(journalEntries.status, 'posted'),
            between(journalEntries.date, budget.fromDate, budget.toDate),
          ),
        );

      const actual = parseFloat(result?.total || '0');
      totalActual += actual;

      await this.db
        .update(budgetLines)
        .set({ actualAmount: actual.toFixed(4) })
        .where(eq(budgetLines.id, line.id));

      // Check if over budget
      const budgeted = parseFloat(line.budgetedAmount);
      if (actual > budgeted && budgeted > 0) {
        const percentage = ((actual / budgeted) * 100).toFixed(0);
        this.logger.warn(
          `Budget line ${line.accountName} exceeded: ${percentage}% (${actual} / ${budgeted})`,
        );
      }
    }

    await this.db
      .update(budgets)
      .set({ totalActual: totalActual.toFixed(4), updatedAt: new Date() })
      .where(eq(budgets.id, id));

    return this.findById(tenantId, id);
  }

  async checkBudgetAvailability(tenantId: string, amount: number, date: string): Promise<{ available: boolean; budgetName?: string; remaining?: number; message?: string }> {
    const activeBudgets = await this.db.select().from(budgets).where(
      and(
        eq(budgets.tenantId, tenantId),
        eq(budgets.status, 'active'),
        sql`${budgets.fromDate} <= ${date}`,
        sql`${budgets.toDate} >= ${date}`,
      )
    );
    if (activeBudgets.length === 0) {
      return { available: true, message: 'No active budget for this period' };
    }
    for (const budget of activeBudgets) {
      const totalBudgeted = parseFloat(budget.totalBudgeted || '0');
      const totalActual = parseFloat(budget.totalActual || '0');
      const remaining = totalBudgeted - totalActual;
      if (amount > remaining) {
        return {
          available: false,
          budgetName: budget.name,
          remaining,
          message: `Exceeds budget "${budget.name}" by ${(amount - remaining).toFixed(2)}. Available: ${remaining.toFixed(2)}`,
        };
      }
    }
    return { available: true };
  }

  async softDelete(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.status === 'active') {
      throw new BadRequestException('Cannot delete an active budget. Close it first.');
    }

    await this.db
      .update(budgets)
      .set({ deletedAt: new Date() })
      .where(eq(budgets.id, id));
  }
}
