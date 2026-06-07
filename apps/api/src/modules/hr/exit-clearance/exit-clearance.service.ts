import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  exitClearances,
  finalSettlements,
  employees,
} from '../../../database/schema/index.js';
import { CreateExitClearanceDto } from './dto/create-exit-clearance.dto.js';
import { UpdateExitClearanceDto } from './dto/update-exit-clearance.dto.js';
import { SettleDto } from './dto/settle.dto.js';

type ExitStatus = 'in_progress' | 'cleared' | 'settled' | 'cancelled';

@Injectable()
export class ExitClearanceService {
  private readonly logger = new Logger(ExitClearanceService.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      employeeId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(exitClearances.tenantId, tenantId),
      isNull(exitClearances.deletedAt),
    ];

    if (options?.status) {
      conditions.push(eq(exitClearances.status, options.status as ExitStatus));
    }

    if (options?.employeeId) {
      conditions.push(eq(exitClearances.employeeId, options.employeeId));
    }

    const rows = await this.db
      .select({
        id: exitClearances.id,
        tenantId: exitClearances.tenantId,
        employeeId: exitClearances.employeeId,
        employeeName: employees.firstName,
        employeeLastName: employees.lastName,
        resignationDate: exitClearances.resignationDate,
        lastWorkingDate: exitClearances.lastWorkingDate,
        reason: exitClearances.reason,
        status: exitClearances.status,
        itCleared: exitClearances.itCleared,
        financeCleared: exitClearances.financeCleared,
        hrCleared: exitClearances.hrCleared,
        adminCleared: exitClearances.adminCleared,
        managerCleared: exitClearances.managerCleared,
        createdAt: exitClearances.createdAt,
        updatedAt: exitClearances.updatedAt,
      })
      .from(exitClearances)
      .leftJoin(employees, eq(employees.id, exitClearances.employeeId))
      .where(and(...conditions))
      .orderBy(desc(exitClearances.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return rows.map((r) => ({
      ...r,
      employeeName: [r.employeeName, r.employeeLastName]
        .filter(Boolean)
        .join(' '),
    }));
  }

  async findById(tenantId: string, id: string) {
    const [clearance] = await this.db
      .select()
      .from(exitClearances)
      .where(
        and(
          eq(exitClearances.id, id),
          eq(exitClearances.tenantId, tenantId),
          isNull(exitClearances.deletedAt),
        ),
      )
      .limit(1);

    if (!clearance) {
      throw new NotFoundException('Exit clearance not found');
    }

    const [employee] = await this.db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeId: employees.employeeId,
      })
      .from(employees)
      .where(eq(employees.id, clearance.employeeId))
      .limit(1);

    const [settlement] = await this.db
      .select()
      .from(finalSettlements)
      .where(
        and(
          eq(finalSettlements.exitClearanceId, id),
          eq(finalSettlements.tenantId, tenantId),
        ),
      )
      .limit(1);

    return {
      ...clearance,
      employeeName: employee
        ? [employee.firstName, employee.lastName].filter(Boolean).join(' ')
        : null,
      employeeCode: employee?.employeeId ?? null,
      finalSettlement: settlement ?? null,
    };
  }

  async create(tenantId: string, dto: CreateExitClearanceDto) {
    const [clearance] = await this.db
      .insert(exitClearances)
      .values({
        tenantId,
        employeeId: dto.employeeId,
        resignationDate: dto.resignationDate || null,
        lastWorkingDate: dto.lastWorkingDate || null,
        reason: dto.reason || null,
        notes: dto.notes || null,
        status: 'in_progress',
      })
      .returning();

    return this.findById(tenantId, clearance.id);
  }

  async update(tenantId: string, id: string, dto: UpdateExitClearanceDto) {
    const existing = await this.findById(tenantId, id);

    const itCleared = dto.itCleared ?? existing.itCleared;
    const financeCleared = dto.financeCleared ?? existing.financeCleared;
    const hrCleared = dto.hrCleared ?? existing.hrCleared;
    const adminCleared = dto.adminCleared ?? existing.adminCleared;
    const managerCleared = dto.managerCleared ?? existing.managerCleared;

    const updates: Record<string, unknown> = {
      resignationDate: dto.resignationDate ?? existing.resignationDate,
      lastWorkingDate: dto.lastWorkingDate ?? existing.lastWorkingDate,
      reason: dto.reason ?? existing.reason,
      notes: dto.notes ?? existing.notes,
      itCleared,
      financeCleared,
      hrCleared,
      adminCleared,
      managerCleared,
      updatedAt: new Date(),
    };

    // Auto-advance to 'cleared' when all five checkpoints pass (unless already
    // settled / cancelled).
    const allCleared =
      itCleared && financeCleared && hrCleared && adminCleared && managerCleared;
    if (
      allCleared &&
      existing.status !== 'settled' &&
      existing.status !== 'cancelled'
    ) {
      updates.status = 'cleared';
    }

    await this.db
      .update(exitClearances)
      .set(updates)
      .where(eq(exitClearances.id, id));

    return this.findById(tenantId, id);
  }

  async settle(tenantId: string, id: string, dto: SettleDto) {
    const existing = await this.findById(tenantId, id);

    const gratuityAmount = parseFloat(dto.gratuityAmount || '0');
    const leaveEncashment = parseFloat(dto.leaveEncashment || '0');
    const pendingSalary = parseFloat(dto.pendingSalary || '0');
    const bonusAmount = parseFloat(dto.bonusAmount || '0');
    const deductions = parseFloat(dto.deductions || '0');

    const netPayable =
      gratuityAmount + leaveEncashment + pendingSalary + bonusAmount - deductions;

    const settledDate = dto.settledDate || new Date().toISOString().split('T')[0];

    const values = {
      tenantId,
      exitClearanceId: id,
      employeeId: existing.employeeId,
      gratuityAmount: gratuityAmount.toFixed(2),
      leaveEncashment: leaveEncashment.toFixed(2),
      pendingSalary: pendingSalary.toFixed(2),
      bonusAmount: bonusAmount.toFixed(2),
      deductions: deductions.toFixed(2),
      netPayable: netPayable.toFixed(2),
      settledDate,
      notes: dto.notes || null,
    };

    const [existingSettlement] = await this.db
      .select()
      .from(finalSettlements)
      .where(
        and(
          eq(finalSettlements.exitClearanceId, id),
          eq(finalSettlements.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (existingSettlement) {
      await this.db
        .update(finalSettlements)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(finalSettlements.id, existingSettlement.id));
    } else {
      await this.db.insert(finalSettlements).values(values);
    }

    await this.db
      .update(exitClearances)
      .set({ status: 'settled', updatedAt: new Date() })
      .where(eq(exitClearances.id, id));

    this.logger.log(
      `Settled exit clearance ${id} — net payable ${netPayable.toFixed(2)}`,
    );

    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.db
      .update(exitClearances)
      .set({ deletedAt: new Date() })
      .where(eq(exitClearances.id, id));
  }
}
