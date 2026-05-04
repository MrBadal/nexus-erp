import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, asc, desc, lte, gte, or } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  shifts,
  shiftAssignments,
  type NewShift,
  type NewShiftAssignment,
} from '../../../database/schema/hr-shifts.js';
import { employees } from '../../../database/schema/hr.js';
import { CreateShiftDto } from './dto/create-shift.dto.js';
import { UpdateShiftDto } from './dto/update-shift.dto.js';
import { AssignShiftDto } from './dto/assign-shift.dto.js';

@Injectable()
export class ShiftService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ─── Shift CRUD ─────────────────────────────────────────

  async findAll(tenantId: string) {
    return this.db
      .select()
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), isNull(shifts.deletedAt)))
      .orderBy(asc(shifts.name));
  }

  async findById(tenantId: string, id: string) {
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.id, id),
          eq(shifts.tenantId, tenantId),
          isNull(shifts.deletedAt),
        ),
      )
      .limit(1);

    if (!shift) {
      throw new NotFoundException(`Shift with ID "${id}" not found`);
    }

    return shift;
  }

  async create(tenantId: string, data: CreateShiftDto) {
    const [existing] = await this.db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.tenantId, tenantId),
          eq(shifts.code, data.code),
          isNull(shifts.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Shift with code "${data.code}" already exists`);
    }

    const values: NewShift = {
      tenantId,
      name: data.name,
      code: data.code,
      startTime: data.startTime,
      endTime: data.endTime,
      breakMinutes: data.breakMinutes ?? 0,
      weekendDays: data.weekendDays ?? [0, 6],
      isActive: data.isActive ?? true,
    };

    const [shift] = await this.db.insert(shifts).values(values).returning();
    return shift;
  }

  async update(tenantId: string, id: string, data: UpdateShiftDto) {
    await this.findById(tenantId, id);

    if (data.code) {
      const [conflict] = await this.db
        .select()
        .from(shifts)
        .where(
          and(
            eq(shifts.tenantId, tenantId),
            eq(shifts.code, data.code),
            isNull(shifts.deletedAt),
          ),
        )
        .limit(1);

      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Shift with code "${data.code}" already exists`);
      }
    }

    const updateData: Partial<NewShift> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.breakMinutes !== undefined) updateData.breakMinutes = data.breakMinutes;
    if (data.weekendDays !== undefined) updateData.weekendDays = data.weekendDays;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await this.db
      .update(shifts)
      .set(updateData)
      .where(eq(shifts.id, id))
      .returning();

    return updated;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(shifts)
      .set({ deletedAt: new Date(), isActive: false })
      .where(eq(shifts.id, id))
      .returning();

    return deleted;
  }

  // ─── Assignments ────────────────────────────────────────

  async findAssignments(tenantId: string, shiftId?: string, employeeId?: string) {
    const conditions = [eq(shiftAssignments.tenantId, tenantId)];

    if (shiftId) conditions.push(eq(shiftAssignments.shiftId, shiftId));
    if (employeeId) conditions.push(eq(shiftAssignments.employeeId, employeeId));

    return this.db
      .select({
        id: shiftAssignments.id,
        tenantId: shiftAssignments.tenantId,
        employeeId: shiftAssignments.employeeId,
        shiftId: shiftAssignments.shiftId,
        effectiveFrom: shiftAssignments.effectiveFrom,
        effectiveTo: shiftAssignments.effectiveTo,
        createdAt: shiftAssignments.createdAt,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        employeeCode: employees.employeeId,
        shiftName: shifts.name,
        shiftCode: shifts.code,
      })
      .from(shiftAssignments)
      .leftJoin(employees, eq(shiftAssignments.employeeId, employees.id))
      .leftJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(and(...conditions))
      .orderBy(desc(shiftAssignments.effectiveFrom));
  }

  async assignShift(tenantId: string, data: AssignShiftDto) {
    // Validate shift
    await this.findById(tenantId, data.shiftId);

    // Validate employee
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, data.employeeId),
          eq(employees.tenantId, tenantId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (data.effectiveTo && data.effectiveTo < data.effectiveFrom) {
      throw new BadRequestException('effectiveTo cannot be earlier than effectiveFrom');
    }

    // Close any open-ended assignment for this employee that overlaps
    await this.db
      .update(shiftAssignments)
      .set({ effectiveTo: data.effectiveFrom })
      .where(
        and(
          eq(shiftAssignments.tenantId, tenantId),
          eq(shiftAssignments.employeeId, data.employeeId),
          isNull(shiftAssignments.effectiveTo),
        ),
      );

    const values: NewShiftAssignment = {
      tenantId,
      employeeId: data.employeeId,
      shiftId: data.shiftId,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? null,
    };

    const [assignment] = await this.db
      .insert(shiftAssignments)
      .values(values)
      .returning();

    return assignment;
  }

  async deactivateShift(tenantId: string, assignmentId: string, effectiveTo: string) {
    const [assignment] = await this.db
      .select()
      .from(shiftAssignments)
      .where(
        and(
          eq(shiftAssignments.id, assignmentId),
          eq(shiftAssignments.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!assignment) {
      throw new NotFoundException('Shift assignment not found');
    }

    if (effectiveTo < assignment.effectiveFrom) {
      throw new BadRequestException('effectiveTo cannot be earlier than effectiveFrom');
    }

    const [updated] = await this.db
      .update(shiftAssignments)
      .set({ effectiveTo })
      .where(eq(shiftAssignments.id, assignmentId))
      .returning();

    return updated;
  }

  // ─── Active Shift Lookup ────────────────────────────────

  async getActiveShiftForEmployee(employeeId: string, date: string) {
    const [assignment] = await this.db
      .select({
        assignmentId: shiftAssignments.id,
        shiftId: shifts.id,
        tenantId: shifts.tenantId,
        name: shifts.name,
        code: shifts.code,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        breakMinutes: shifts.breakMinutes,
        weekendDays: shifts.weekendDays,
        isActive: shifts.isActive,
        effectiveFrom: shiftAssignments.effectiveFrom,
        effectiveTo: shiftAssignments.effectiveTo,
      })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(
        and(
          eq(shiftAssignments.employeeId, employeeId),
          lte(shiftAssignments.effectiveFrom, date),
          or(
            isNull(shiftAssignments.effectiveTo),
            gte(shiftAssignments.effectiveTo, date),
          ),
          isNull(shifts.deletedAt),
        ),
      )
      .orderBy(desc(shiftAssignments.effectiveFrom))
      .limit(1);

    return assignment ?? null;
  }
}
