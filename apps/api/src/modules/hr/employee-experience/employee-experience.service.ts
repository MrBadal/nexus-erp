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
  employeeExperience,
  type NewEmployeeExperience,
} from '../../../database/schema/hr-personal.js';
import { CreateExperienceDto } from './dto/create-experience.dto.js';
import { UpdateExperienceDto } from './dto/update-experience.dto.js';

@Injectable()
export class EmployeeExperienceService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAllForEmployee(tenantId: string, employeeId?: string) {
    const conditions = [
      eq(employeeExperience.tenantId, tenantId),
      isNull(employeeExperience.deletedAt),
    ];
    if (employeeId) {
      conditions.push(eq(employeeExperience.employeeId, employeeId));
    }

    return this.db
      .select()
      .from(employeeExperience)
      .where(and(...conditions))
      .orderBy(desc(employeeExperience.fromDate));
  }

  async findById(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(employeeExperience)
      .where(
        and(
          eq(employeeExperience.id, id),
          eq(employeeExperience.tenantId, tenantId),
          isNull(employeeExperience.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Experience entry "${id}" not found`);
    }
    return row;
  }

  async create(tenantId: string, data: CreateExperienceDto) {
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

    const values: NewEmployeeExperience = {
      tenantId,
      employeeId: data.employeeId,
      companyName: data.companyName,
      title: data.title,
      fromDate: data.fromDate,
      toDate: data.toDate ?? null,
      employmentType: data.employmentType ?? null,
      description: data.description ?? null,
    };

    const [created] = await this.db
      .insert(employeeExperience)
      .values(values)
      .returning();

    return created;
  }

  async update(tenantId: string, id: string, data: UpdateExperienceDto) {
    await this.findById(tenantId, id);

    const updates: Partial<NewEmployeeExperience> = {
      updatedAt: new Date(),
    };
    if (data.companyName !== undefined) updates.companyName = data.companyName;
    if (data.title !== undefined) updates.title = data.title;
    if (data.fromDate !== undefined) updates.fromDate = data.fromDate;
    if (data.toDate !== undefined) updates.toDate = data.toDate;
    if (data.employmentType !== undefined)
      updates.employmentType = data.employmentType;
    if (data.description !== undefined) updates.description = data.description;

    const [updated] = await this.db
      .update(employeeExperience)
      .set(updates)
      .where(
        and(
          eq(employeeExperience.id, id),
          eq(employeeExperience.tenantId, tenantId),
        ),
      )
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db
      .update(employeeExperience)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(employeeExperience.id, id),
          eq(employeeExperience.tenantId, tenantId),
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
    data: UpdateExperienceDto,
  ) {
    await this.findMineById(tenantId, scopedEmployeeId, id);
    return this.update(tenantId, id, data);
  }

  async deleteMine(tenantId: string, scopedEmployeeId: string, id: string) {
    await this.findMineById(tenantId, scopedEmployeeId, id);
    return this.softDelete(tenantId, id);
  }
}
