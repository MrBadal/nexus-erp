import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, asc, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  offboardingTemplates,
  offboardingTemplateTasks,
} from '../../../database/schema/hr-onboarding.js';
import {
  CreateOffboardingTemplateDto,
  UpdateOffboardingTemplateDto,
} from './dto/offboarding.dto.js';

@Injectable()
export class OffboardingTemplateService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string, options?: { isActive?: boolean; designationId?: string }) {
    const conditions = [
      eq(offboardingTemplates.tenantId, tenantId),
      isNull(offboardingTemplates.deletedAt),
    ];
    if (options?.isActive !== undefined) {
      conditions.push(eq(offboardingTemplates.isActive, options.isActive));
    }
    if (options?.designationId) {
      conditions.push(eq(offboardingTemplates.designationId, options.designationId));
    }

    return this.db
      .select()
      .from(offboardingTemplates)
      .where(and(...conditions))
      .orderBy(desc(offboardingTemplates.createdAt));
  }

  async findById(tenantId: string, id: string) {
    const [template] = await this.db
      .select()
      .from(offboardingTemplates)
      .where(
        and(
          eq(offboardingTemplates.id, id),
          eq(offboardingTemplates.tenantId, tenantId),
          isNull(offboardingTemplates.deletedAt),
        ),
      )
      .limit(1);

    if (!template) throw new NotFoundException('Offboarding template not found');

    const tasks = await this.db
      .select()
      .from(offboardingTemplateTasks)
      .where(eq(offboardingTemplateTasks.templateId, id))
      .orderBy(asc(offboardingTemplateTasks.sequence));

    return { ...template, tasks };
  }

  async findFirstActiveForDesignation(tenantId: string, designationId: string | null) {
    if (designationId) {
      const [match] = await this.db
        .select()
        .from(offboardingTemplates)
        .where(
          and(
            eq(offboardingTemplates.tenantId, tenantId),
            eq(offboardingTemplates.designationId, designationId),
            eq(offboardingTemplates.isActive, true),
            isNull(offboardingTemplates.deletedAt),
          ),
        )
        .limit(1);
      if (match) return match;
    }

    const [fallback] = await this.db
      .select()
      .from(offboardingTemplates)
      .where(
        and(
          eq(offboardingTemplates.tenantId, tenantId),
          eq(offboardingTemplates.isActive, true),
          isNull(offboardingTemplates.deletedAt),
        ),
      )
      .orderBy(asc(offboardingTemplates.createdAt))
      .limit(1);

    return fallback || null;
  }

  async create(tenantId: string, dto: CreateOffboardingTemplateDto) {
    const [template] = await this.db
      .insert(offboardingTemplates)
      .values({
        tenantId,
        name: dto.name,
        designationId: dto.designationId || null,
        description: dto.description || null,
        isActive: dto.isActive ?? true,
      })
      .returning();

    if (dto.tasks && dto.tasks.length > 0) {
      await this.db.insert(offboardingTemplateTasks).values(
        dto.tasks.map((t, idx) => ({
          templateId: template.id,
          sequence: t.sequence ?? idx,
          title: t.title,
          description: t.description || null,
          defaultAssignee: t.defaultAssignee ?? 'hr',
          dueDays: t.dueDays ?? 0,
          isMandatory: t.isMandatory ?? true,
        })),
      );
    }

    return this.findById(tenantId, template.id);
  }

  async update(tenantId: string, id: string, dto: UpdateOffboardingTemplateDto) {
    await this.findById(tenantId, id);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.designationId !== undefined) updates.designationId = dto.designationId;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    await this.db
      .update(offboardingTemplates)
      .set(updates)
      .where(eq(offboardingTemplates.id, id));

    if (dto.tasks) {
      await this.db
        .delete(offboardingTemplateTasks)
        .where(eq(offboardingTemplateTasks.templateId, id));
      if (dto.tasks.length > 0) {
        await this.db.insert(offboardingTemplateTasks).values(
          dto.tasks.map((t, idx) => ({
            templateId: id,
            sequence: t.sequence ?? idx,
            title: t.title,
            description: t.description || null,
            defaultAssignee: t.defaultAssignee ?? 'hr',
            dueDays: t.dueDays ?? 0,
            isMandatory: t.isMandatory ?? true,
          })),
        );
      }
    }

    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db
      .update(offboardingTemplates)
      .set({ deletedAt: new Date() })
      .where(eq(offboardingTemplates.id, id));
  }
}
