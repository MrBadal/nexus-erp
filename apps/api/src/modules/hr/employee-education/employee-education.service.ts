import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { employees } from '../../../database/schema/index.js';
import {
  employeeEducation,
  type NewEmployeeEducation,
} from '../../../database/schema/hr-personal.js';
import { CreateEducationDto } from './dto/create-education.dto.js';
import { UpdateEducationDto } from './dto/update-education.dto.js';

@Injectable()
export class EmployeeEducationService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAllForEmployee(tenantId: string, employeeId?: string) {
    const conditions = [
      eq(employeeEducation.tenantId, tenantId),
      isNull(employeeEducation.deletedAt),
    ];
    if (employeeId) {
      conditions.push(eq(employeeEducation.employeeId, employeeId));
    }

    const rows = await this.db
      .select()
      .from(employeeEducation)
      .where(and(...conditions))
      .orderBy(desc(employeeEducation.startYear));

    return rows;
  }

  async findById(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(employeeEducation)
      .where(
        and(
          eq(employeeEducation.id, id),
          eq(employeeEducation.tenantId, tenantId),
          isNull(employeeEducation.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Education entry "${id}" not found`);
    }
    return row;
  }

  async create(tenantId: string, data: CreateEducationDto) {
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

    const values: NewEmployeeEducation = {
      tenantId,
      employeeId: data.employeeId,
      degree: data.degree,
      institution: data.institution,
      fieldOfStudy: data.fieldOfStudy ?? null,
      startYear: data.startYear,
      endYear: data.endYear ?? null,
      grade: data.grade ?? null,
      notes: data.notes ?? null,
    };

    const [created] = await this.db
      .insert(employeeEducation)
      .values(values)
      .returning();

    return created;
  }

  async update(tenantId: string, id: string, data: UpdateEducationDto) {
    await this.findById(tenantId, id);

    const updates: Partial<NewEmployeeEducation> = {
      updatedAt: new Date(),
    };
    if (data.degree !== undefined) updates.degree = data.degree;
    if (data.institution !== undefined) updates.institution = data.institution;
    if (data.fieldOfStudy !== undefined)
      updates.fieldOfStudy = data.fieldOfStudy;
    if (data.startYear !== undefined) updates.startYear = data.startYear;
    if (data.endYear !== undefined) updates.endYear = data.endYear;
    if (data.grade !== undefined) updates.grade = data.grade;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await this.db
      .update(employeeEducation)
      .set(updates)
      .where(
        and(
          eq(employeeEducation.id, id),
          eq(employeeEducation.tenantId, tenantId),
        ),
      )
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db
      .update(employeeEducation)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(employeeEducation.id, id),
          eq(employeeEducation.tenantId, tenantId),
        ),
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
    data: UpdateEducationDto,
  ) {
    await this.findMineById(tenantId, scopedEmployeeId, id);
    return this.update(tenantId, id, data);
  }

  async deleteMine(tenantId: string, scopedEmployeeId: string, id: string) {
    await this.findMineById(tenantId, scopedEmployeeId, id);
    return this.softDelete(tenantId, id);
  }
}
