import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, asc, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  onboardingTemplates,
  onboardingTemplateTasks,
} from '../../../database/schema/hr-onboarding.js';
import {
  CreateOnboardingTemplateDto,
  UpdateOnboardingTemplateDto,
} from './dto/onboarding.dto.js';

@Injectable()
export class OnboardingTemplateService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string, options?: { isActive?: boolean; designationId?: string }) {
    const conditions = [
      eq(onboardingTemplates.tenantId, tenantId),
      isNull(onboardingTemplates.deletedAt),
    ];
    if (options?.isActive !== undefined) {
      conditions.push(eq(onboardingTemplates.isActive, options.isActive));
    }
    if (options?.designationId) {
      conditions.push(eq(onboardingTemplates.designationId, options.designationId));
    }

    return this.db
      .select()
      .from(onboardingTemplates)
      .where(and(...conditions))
      .orderBy(desc(onboardingTemplates.createdAt));
  }

  async findById(tenantId: string, id: string) {
    const [template] = await this.db
      .select()
      .from(onboardingTemplates)
      .where(
        and(
          eq(onboardingTemplates.id, id),
          eq(onboardingTemplates.tenantId, tenantId),
          isNull(onboardingTemplates.deletedAt),
        ),
      )
      .limit(1);

    if (!template) throw new NotFoundException('Onboarding template not found');

    const tasks = await this.db
      .select()
      .from(onboardingTemplateTasks)
      .where(eq(onboardingTemplateTasks.templateId, id))
      .orderBy(asc(onboardingTemplateTasks.sequence));

    return { ...template, tasks };
  }

  async findFirstActiveForDesignation(tenantId: string, designationId: string | null) {
    // Try designation-specific template first
    if (designationId) {
      const [match] = await this.db
        .select()
        .from(onboardingTemplates)
        .where(
          and(
            eq(onboardingTemplates.tenantId, tenantId),
            eq(onboardingTemplates.designationId, designationId),
            eq(onboardingTemplates.isActive, true),
            isNull(onboardingTemplates.deletedAt),
          ),
        )
        .limit(1);
      if (match) return match;
    }

    // Fallback: any active template (designationId nullable)
    const [fallback] = await this.db
      .select()
      .from(onboardingTemplates)
      .where(
        and(
          eq(onboardingTemplates.tenantId, tenantId),
          eq(onboardingTemplates.isActive, true),
          isNull(onboardingTemplates.deletedAt),
        ),
      )
      .orderBy(asc(onboardingTemplates.createdAt))
      .limit(1);

    return fallback || null;
  }

  async create(tenantId: string, dto: CreateOnboardingTemplateDto) {
    const [template] = await this.db
      .insert(onboardingTemplates)
      .values({
        tenantId,
        name: dto.name,
        designationId: dto.designationId || null,
        description: dto.description || null,
        isActive: dto.isActive ?? true,
      })
      .returning();

    if (dto.tasks && dto.tasks.length > 0) {
      await this.db.insert(onboardingTemplateTasks).values(
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

  async update(tenantId: string, id: string, dto: UpdateOnboardingTemplateDto) {
    await this.findById(tenantId, id);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.designationId !== undefined) updates.designationId = dto.designationId;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    await this.db
      .update(onboardingTemplates)
      .set(updates)
      .where(eq(onboardingTemplates.id, id));

    if (dto.tasks) {
      await this.db
        .delete(onboardingTemplateTasks)
        .where(eq(onboardingTemplateTasks.templateId, id));
      if (dto.tasks.length > 0) {
        await this.db.insert(onboardingTemplateTasks).values(
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
      .update(onboardingTemplates)
      .set({ deletedAt: new Date() })
      .where(eq(onboardingTemplates.id, id));
  }
}
