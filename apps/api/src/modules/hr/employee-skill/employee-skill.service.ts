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
  employeeSkills,
  type NewEmployeeSkill,
} from '../../../database/schema/hr-personal.js';
import { CreateSkillDto } from './dto/create-skill.dto.js';
import { UpdateSkillDto } from './dto/update-skill.dto.js';

@Injectable()
export class EmployeeSkillService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAllForEmployee(tenantId: string, employeeId?: string) {
    const conditions = [
      eq(employeeSkills.tenantId, tenantId),
      isNull(employeeSkills.deletedAt),
    ];
    if (employeeId) {
      conditions.push(eq(employeeSkills.employeeId, employeeId));
    }

    return this.db
      .select()
      .from(employeeSkills)
      .where(and(...conditions))
      .orderBy(asc(employeeSkills.category), asc(employeeSkills.skill));
  }

  async findById(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(employeeSkills)
      .where(
        and(
          eq(employeeSkills.id, id),
          eq(employeeSkills.tenantId, tenantId),
          isNull(employeeSkills.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Skill entry "${id}" not found`);
    }
    return row;
  }

  async create(tenantId: string, data: CreateSkillDto) {
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

    const values: NewEmployeeSkill = {
      tenantId,
      employeeId: data.employeeId,
      skill: data.skill,
      category: data.category ?? null,
      proficiency: data.proficiency,
      yearsOfExperience: data.yearsOfExperience ?? null,
      certificationName: data.certificationName ?? null,
      certificationIssuer: data.certificationIssuer ?? null,
      certificationDate: data.certificationDate ?? null,
      certificationExpiresAt: data.certificationExpiresAt ?? null,
      notes: data.notes ?? null,
    };

    const [created] = await this.db
      .insert(employeeSkills)
      .values(values)
      .returning();

    return created;
  }

  async update(tenantId: string, id: string, data: UpdateSkillDto) {
    await this.findById(tenantId, id);

    const updates: Partial<NewEmployeeSkill> = {
      updatedAt: new Date(),
    };
    if (data.skill !== undefined) updates.skill = data.skill;
    if (data.category !== undefined) updates.category = data.category;
    if (data.proficiency !== undefined) updates.proficiency = data.proficiency;
    if (data.yearsOfExperience !== undefined)
      updates.yearsOfExperience = data.yearsOfExperience;
    if (data.certificationName !== undefined)
      updates.certificationName = data.certificationName;
    if (data.certificationIssuer !== undefined)
      updates.certificationIssuer = data.certificationIssuer;
    if (data.certificationDate !== undefined)
      updates.certificationDate = data.certificationDate;
    if (data.certificationExpiresAt !== undefined)
      updates.certificationExpiresAt = data.certificationExpiresAt;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await this.db
      .update(employeeSkills)
      .set(updates)
      .where(
        and(eq(employeeSkills.id, id), eq(employeeSkills.tenantId, tenantId)),
      )
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db
      .update(employeeSkills)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(employeeSkills.id, id), eq(employeeSkills.tenantId, tenantId)),
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
    data: UpdateSkillDto,
  ) {
    await this.findMineById(tenantId, scopedEmployeeId, id);
    return this.update(tenantId, id, data);
  }

  async deleteMine(tenantId: string, scopedEmployeeId: string, id: string) {
    await this.findMineById(tenantId, scopedEmployeeId, id);
    return this.softDelete(tenantId, id);
  }
}
