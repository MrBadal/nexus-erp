import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  employeeLoans,
  loanRepayments,
} from '../../../database/schema/hr-loans.js';
import { employees } from '../../../database/schema/index.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { UpdateLoanDto } from './dto/update-loan.dto.js';
import { RecordRepaymentDto } from './dto/record-repayment.dto.js';

type LoanStatus = 'pending' | 'approved' | 'rejected' | 'closed' | 'cancelled';

@Injectable()
export class LoanService {
  private readonly logger = new Logger(LoanService.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      employeeId?: string;
      type?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(employeeLoans.tenantId, tenantId),
      isNull(employeeLoans.deletedAt),
    ];

    if (options?.status) {
      conditions.push(eq(employeeLoans.status, options.status));
    }

    if (options?.employeeId) {
      conditions.push(eq(employeeLoans.employeeId, options.employeeId));
    }

    if (options?.type) {
      conditions.push(eq(employeeLoans.type, options.type));
    }

    const loans = await this.db
      .select({
        id: employeeLoans.id,
        tenantId: employeeLoans.tenantId,
        loanNumber: employeeLoans.loanNumber,
        employeeId: employeeLoans.employeeId,
        employeeName: employees.firstName,
        type: employeeLoans.type,
        principalAmount: employeeLoans.principalAmount,
        interestRate: employeeLoans.interestRate,
        installments: employeeLoans.installments,
        installmentsPaid: employeeLoans.installmentsPaid,
        emiAmount: employeeLoans.emiAmount,
        outstandingAmount: employeeLoans.outstandingAmount,
        status: employeeLoans.status,
        disbursedDate: employeeLoans.disbursedDate,
        reason: employeeLoans.reason,
        createdAt: employeeLoans.createdAt,
        updatedAt: employeeLoans.updatedAt,
      })
      .from(employeeLoans)
      .leftJoin(employees, eq(employees.id, employeeLoans.employeeId))
      .where(and(...conditions))
      .orderBy(desc(employeeLoans.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return loans;
  }

  async findById(tenantId: string, id: string) {
    const [loan] = await this.db
      .select()
      .from(employeeLoans)
      .where(
        and(
          eq(employeeLoans.id, id),
          eq(employeeLoans.tenantId, tenantId),
          isNull(employeeLoans.deletedAt),
        ),
      )
      .limit(1);

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const repayments = await this.db
      .select()
      .from(loanRepayments)
      .where(eq(loanRepayments.loanId, id))
      .orderBy(desc(loanRepayments.paidDate));

    return { ...loan, repayments };
  }

  private computeEmi(principal: number, interestRate: number, installments: number): string {
    const total = principal * (1 + interestRate / 100);
    const emi = total / Math.max(installments, 1);
    return emi.toFixed(2);
  }

  async create(tenantId: string, dto: CreateLoanDto) {
    const loanNumber = `LOAN-${Date.now()}`;
    const principal = parseFloat(dto.principalAmount);
    const interestRate = dto.interestRate ? parseFloat(dto.interestRate) : 0;
    const installments = dto.installments || 1;

    const emiAmount =
      dto.emiAmount ?? this.computeEmi(principal, interestRate, installments);

    const [loan] = await this.db
      .insert(employeeLoans)
      .values({
        tenantId,
        employeeId: dto.employeeId,
        loanNumber,
        type: dto.type,
        principalAmount: principal.toFixed(2),
        interestRate: interestRate.toFixed(2),
        installments,
        emiAmount,
        outstandingAmount: principal.toFixed(2),
        reason: dto.reason || null,
        status: 'pending',
      })
      .returning();

    return this.findById(tenantId, loan.id);
  }

  async update(tenantId: string, id: string, dto: UpdateLoanDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'pending') {
      throw new BadRequestException('Only pending loans can be updated');
    }

    const principal = dto.principalAmount
      ? parseFloat(dto.principalAmount)
      : parseFloat(existing.principalAmount);
    const interestRate = dto.interestRate
      ? parseFloat(dto.interestRate)
      : parseFloat(existing.interestRate);
    const installments = dto.installments ?? existing.installments;

    const emiAmount =
      dto.emiAmount ?? this.computeEmi(principal, interestRate, installments);

    await this.db
      .update(employeeLoans)
      .set({
        type: dto.type ?? existing.type,
        principalAmount: principal.toFixed(2),
        interestRate: interestRate.toFixed(2),
        installments,
        emiAmount,
        outstandingAmount: principal.toFixed(2),
        reason: dto.reason ?? existing.reason,
        updatedAt: new Date(),
      })
      .where(eq(employeeLoans.id, id));

    return this.findById(tenantId, id);
  }

  async approve(tenantId: string, id: string, userId?: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'pending') {
      throw new BadRequestException('Only pending loans can be approved');
    }

    const today = new Date().toISOString().split('T')[0];

    await this.db
      .update(employeeLoans)
      .set({
        status: 'approved' as LoanStatus,
        approvedBy: userId || null,
        approvedAt: new Date(),
        disbursedDate: today,
        updatedAt: new Date(),
      })
      .where(eq(employeeLoans.id, id));

    return this.findById(tenantId, id);
  }

  async reject(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'pending') {
      throw new BadRequestException('Only pending loans can be rejected');
    }

    await this.db
      .update(employeeLoans)
      .set({ status: 'rejected' as LoanStatus, updatedAt: new Date() })
      .where(eq(employeeLoans.id, id));

    return this.findById(tenantId, id);
  }

  async recordRepayment(tenantId: string, id: string, dto: RecordRepaymentDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'approved') {
      throw new BadRequestException('Repayments can only be recorded for approved loans');
    }

    const amount = parseFloat(dto.amount);
    if (!(amount > 0)) {
      throw new BadRequestException('Repayment amount must be greater than zero');
    }

    await this.db.insert(loanRepayments).values({
      tenantId,
      loanId: id,
      amount: amount.toFixed(2),
      paidDate: dto.paidDate,
      note: dto.note || null,
    });

    const newOutstanding = Math.max(
      0,
      parseFloat(existing.outstandingAmount) - amount,
    );
    const newInstallmentsPaid = existing.installmentsPaid + 1;
    const newStatus: LoanStatus = newOutstanding <= 0 ? 'closed' : 'approved';

    await this.db
      .update(employeeLoans)
      .set({
        outstandingAmount: newOutstanding.toFixed(2),
        installmentsPaid: newInstallmentsPaid,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(employeeLoans.id, id));

    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.db
      .update(employeeLoans)
      .set({ deletedAt: new Date() })
      .where(eq(employeeLoans.id, id));
  }

  /**
   * Returns the total EMI amount to deduct from payroll for a given employee:
   * sum of emiAmount across all approved loans with outstanding balance > 0.
   * Intended for payroll integration.
   */
  async getActiveLoanDeduction(tenantId: string, employeeId: string): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${employeeLoans.emiAmount}), 0)`,
      })
      .from(employeeLoans)
      .where(
        and(
          eq(employeeLoans.tenantId, tenantId),
          eq(employeeLoans.employeeId, employeeId),
          eq(employeeLoans.status, 'approved'),
          sql`${employeeLoans.outstandingAmount} > 0`,
          isNull(employeeLoans.deletedAt),
        ),
      );

    return row ? parseFloat(row.total) : 0;
  }
}
