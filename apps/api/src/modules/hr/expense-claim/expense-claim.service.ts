import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, desc, like } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  expenseClaims,
  expenseClaimLines,
  employees,
  journalEntries,
  journalLines,
  accounts,
} from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';
import { ApprovalWorkflowService } from '../../shared/approval-workflow.service.js';

const EXPENSE_APPROVAL_THRESHOLD_INR = 100000;

export interface CreateExpenseClaimDto {
  employeeId: string;
  claimDate: string;
  purpose?: string;
  notes?: string;
  lines: {
    expenseDate: string;
    category: string;
    description?: string;
    amount: string;
  }[];
}

export interface UpdateExpenseClaimDto {
  purpose?: string;
  notes?: string;
  lines?: {
    expenseDate: string;
    category: string;
    description?: string;
    amount: string;
  }[];
}

@Injectable()
export class ExpenseClaimService {
  private readonly logger = new Logger(ExpenseClaimService.name);

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly approvalService: ApprovalWorkflowService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      employeeId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(expenseClaims.tenantId, tenantId),
      isNull(expenseClaims.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(expenseClaims.status, options.status as 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'cancelled'),
      );
    }

    if (options?.employeeId) {
      conditions.push(eq(expenseClaims.employeeId, options.employeeId));
    }

    if (options?.search) {
      conditions.push(like(expenseClaims.claimNumber, `%${options.search}%`));
    }

    const claims = await this.db
      .select({
        id: expenseClaims.id,
        tenantId: expenseClaims.tenantId,
        claimNumber: expenseClaims.claimNumber,
        employeeId: expenseClaims.employeeId,
        employeeName: employees.firstName,
        claimDate: expenseClaims.claimDate,
        status: expenseClaims.status,
        totalAmount: expenseClaims.totalAmount,
        approvedAmount: expenseClaims.approvedAmount,
        purpose: expenseClaims.purpose,
        createdAt: expenseClaims.createdAt,
        updatedAt: expenseClaims.updatedAt,
      })
      .from(expenseClaims)
      .leftJoin(employees, eq(employees.id, expenseClaims.employeeId))
      .where(and(...conditions))
      .orderBy(desc(expenseClaims.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return claims;
  }

  async findById(tenantId: string, id: string) {
    const [claim] = await this.db
      .select()
      .from(expenseClaims)
      .where(
        and(
          eq(expenseClaims.id, id),
          eq(expenseClaims.tenantId, tenantId),
          isNull(expenseClaims.deletedAt),
        ),
      )
      .limit(1);

    if (!claim) {
      throw new NotFoundException('Expense claim not found');
    }

    const lines = await this.db
      .select()
      .from(expenseClaimLines)
      .where(eq(expenseClaimLines.expenseClaimId, id));

    return { ...claim, lines };
  }

  async create(tenantId: string, dto: CreateExpenseClaimDto) {
    const claimNumber = await this.numberSeriesService.getNext(tenantId, 'EXP');

    const totalAmount = dto.lines.reduce(
      (sum, line) => sum + parseFloat(line.amount),
      0,
    );

    const [claim] = await this.db
      .insert(expenseClaims)
      .values({
        tenantId,
        claimNumber,
        employeeId: dto.employeeId,
        claimDate: dto.claimDate,
        totalAmount: totalAmount.toFixed(4),
        purpose: dto.purpose || null,
        notes: dto.notes || null,
      })
      .returning();

    if (dto.lines?.length) {
      await this.db.insert(expenseClaimLines).values(
        dto.lines.map((line) => ({
          expenseClaimId: claim.id,
          expenseDate: line.expenseDate,
          category: line.category,
          description: line.description || null,
          amount: line.amount,
        })),
      );
    }

    return this.findById(tenantId, claim.id);
  }

  async update(tenantId: string, id: string, dto: UpdateExpenseClaimDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft expense claims can be updated');
    }

    await this.db
      .update(expenseClaims)
      .set({
        purpose: dto.purpose ?? existing.purpose,
        notes: dto.notes ?? existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(expenseClaims.id, id));

    if (dto.lines) {
      await this.db
        .delete(expenseClaimLines)
        .where(eq(expenseClaimLines.expenseClaimId, id));

      const totalAmount = dto.lines.reduce(
        (sum, line) => sum + parseFloat(line.amount),
        0,
      );

      await this.db
        .update(expenseClaims)
        .set({ totalAmount: totalAmount.toFixed(4) })
        .where(eq(expenseClaims.id, id));

      if (dto.lines.length) {
        await this.db.insert(expenseClaimLines).values(
          dto.lines.map((line) => ({
            expenseClaimId: id,
            expenseDate: line.expenseDate,
            category: line.category,
            description: line.description || null,
            amount: line.amount,
          })),
        );
      }
    }

    return this.findById(tenantId, id);
  }

  async updateStatus(tenantId: string, id: string, status: string, userId?: string) {
    const existing = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['submitted', 'cancelled'],
      submitted: ['approved', 'rejected'],
      approved: ['paid', 'cancelled'],
      rejected: ['draft'],
    };

    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${existing.status} to ${status}`);
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'submitted') {
      const totalAmt = parseFloat(existing.totalAmount);
      if (totalAmt > EXPENSE_APPROVAL_THRESHOLD_INR && userId) {
        try {
          await this.approvalService.submitForApproval(tenantId, {
            documentType: 'expense_claim',
            documentId: existing.id,
            documentNumber: existing.claimNumber,
            requestedBy: userId,
            amount: existing.totalAmount,
          });
        } catch (err) {
          if (!(err instanceof BadRequestException)) throw err;
        }
      }
    }

    if (status === 'approved' && userId) {
      updates.approvedBy = userId;
      updates.approvedAt = new Date();
      updates.approvedAmount = existing.totalAmount;
    }

    if (status === 'paid') {
      updates.paidAt = new Date();
      // Create journal entry: DR Expense, CR Employee Payable
      await this.createExpenseJournal(tenantId, existing);
    }

    await this.db
      .update(expenseClaims)
      .set(updates)
      .where(eq(expenseClaims.id, id));

    if (status === 'approved' || status === 'rejected') {
      this.eventEmitter.emit('hr.expense.decided', {
        tenantId,
        employeeId: existing.employeeId,
        decision: status as 'approved' | 'rejected',
        amount: existing.totalAmount,
      });
    }

    return this.findById(tenantId, id);
  }

  private async createExpenseJournal(tenantId: string, claim: { id: string; claimNumber: string; totalAmount: string; employeeId: string }) {
    try {
      // Find expense account (first expense type account) and payable account
      const [expenseAccount] = await this.db
        .select()
        .from(accounts)
        .where(and(eq(accounts.tenantId, tenantId), eq(accounts.accountType, 'expense')))
        .limit(1);

      const [payableAccount] = await this.db
        .select()
        .from(accounts)
        .where(and(eq(accounts.tenantId, tenantId), eq(accounts.accountType, 'liability')))
        .limit(1);

      if (!expenseAccount || !payableAccount) {
        this.logger.warn('Cannot create expense journal — missing expense or liability account');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const [je] = await this.db
        .insert(journalEntries)
        .values({
          tenantId,
          entryNumber: `JE-EXP-${claim.claimNumber}`,
          date: today,
          reference: `Expense Claim ${claim.claimNumber}`,
          description: `Expense claim payment: ${claim.claimNumber}`,
          totalDebit: claim.totalAmount,
          totalCredit: claim.totalAmount,
          status: 'posted',
          postedDate: today,
        })
        .returning();

      await this.db.insert(journalLines).values([
        {
          tenantId,
          journalEntryId: je.id,
          lineNumber: 1,
          accountId: expenseAccount.id,
          debitAmount: claim.totalAmount,
          creditAmount: '0',
          description: `Expense claim: ${claim.claimNumber}`,
        },
        {
          tenantId,
          journalEntryId: je.id,
          lineNumber: 2,
          accountId: payableAccount.id,
          debitAmount: '0',
          creditAmount: claim.totalAmount,
          description: `Payable to employee for ${claim.claimNumber}`,
        },
      ]);

      this.logger.log(`Created journal entry ${je.entryNumber} for expense claim ${claim.claimNumber}`);
    } catch (err) {
      this.logger.error(`Failed to create expense journal: ${err}`);
    }
  }

  async softDelete(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft' && existing.status !== 'cancelled') {
      throw new BadRequestException('Only draft or cancelled claims can be deleted');
    }

    await this.db
      .update(expenseClaims)
      .set({ deletedAt: new Date() })
      .where(eq(expenseClaims.id, id));
  }
}
