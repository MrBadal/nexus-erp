import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { employees } from '../../../database/schema/index.js';
import {
  employeeFamily,
  type NewEmployeeFamily,
} from '../../../database/schema/hr-personal.js';
import { CreateFamilyDto } from './dto/create-family.dto.js';
import { UpdateFamilyDto } from './dto/update-family.dto.js';

@Injectable()
export class EmployeeFamilyService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAllForEmployee(tenantId: string, employeeId?: string) {
    const conditions = [
      eq(employeeFamily.tenantId, tenantId),
      isNull(employeeFamily.deletedAt),
    ];
    if (employeeId) {
      conditions.push(eq(employeeFamily.employeeId, employeeId));
    }

    return this.db
      .select()
      .from(employeeFamily)
      .where(and(...conditions))
      .orderBy(asc(employeeFamily.relationship), asc(employeeFamily.name));
  }

  async findById(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(employeeFamily)
      .where(
        and(
          eq(employeeFamily.id, id),
          eq(employeeFamily.tenantId, tenantId),
          isNull(employeeFamily.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Family entry "${id}" not found`);
    }
    return row;
  }

  async create(tenantId: string, data: CreateFamilyDto) {
    const [employee] = await this.db
      .select({ id: employees.id })
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

    const values: NewEmployeeFamily = {
      tenantId,
      employeeId: data.employeeId,
      name: data.name,
      relationship: data.relationship,
      dateOfBirth: data.dateOfBirth ?? null,
      nominee: data.nominee ?? false,
      nomineeSharePercent: data.nomineeSharePercent ?? null,
      aadhaarNumber: data.aadhaarNumber ?? null,
      contactPhone: data.contactPhone ?? null,
      notes: data.notes ?? null,
    };

    const [created] = await this.db
      .insert(employeeFamily)
      .values(values)
      .returning();

    return created;
  }

  async update(tenantId: string, id: string, data: UpdateFamilyDto) {
    await this.findById(tenantId, id);

    const updates: Partial<NewEmployeeFamily> = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) updates.name = data.name;
    if (data.relationship !== undefined) updates.relationship = data.relationship;
    if (data.dateOfBirth !== undefined) updates.dateOfBirth = data.dateOfBirth;
    if (data.nominee !== undefined) updates.nominee = data.nominee;
    if (data.nomineeSharePercent !== undefined)
      updates.nomineeSharePercent = data.nomineeSharePercent;
    if (data.aadhaarNumber !== undefined)
      updates.aadhaarNumber = data.aadhaarNumber;
    if (data.contactPhone !== undefined)
      updates.contactPhone = data.contactPhone;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await this.db
      .update(employeeFamily)
      .set(updates)
      .where(
        and(eq(employeeFamily.id, id), eq(employeeFamily.tenantId, tenantId)),
      )
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db
      .update(employeeFamily)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(employeeFamily.id, id), eq(employeeFamily.tenantId, tenantId)),
      );
    return { success: true };
  }

  // ─── ESS-side helpers ─────────────────────────────────

  async findMine(tenantId: string, scopedEmployeeId: string) {
    return this.findAllForEmployee(tenantId, scopedEmployeeId);
  }

  async findMineById(tenantId: string, scopedEmployeeId: string, id: string) {
    const row = await this.findById(tenantId, id);
    if (row.employeeId !== scopedEmployeeId) {
      throw new ForbiddenException('Not your record');
    }
    return row;
  }

  async updateMine(
    tenantId: string,
    scopedEmployeeId: string,
    id: string,
    data: UpdateFamilyDto,
  ) {
    await this.findMineById(tenantId, scopedEmployeeId, id);
    return this.update(tenantId, id, data);
  }

  async deleteMine(tenantId: string, scopedEmployeeId: string, id: string) {
    await this.findMineById(tenantId, scopedEmployeeId, id);
    return this.softDelete(tenantId, id);
  }
}
