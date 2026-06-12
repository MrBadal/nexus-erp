import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { slaPolicies } from '../../../database/schema/index.js';
import { CreateSlaDto } from './dto/create-sla.dto.js';
import { UpdateSlaDto } from './dto/update-sla.dto.js';

@Injectable()
export class SlaService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      priority?: string;
      isActive?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(slaPolicies.tenantId, tenantId),
      isNull(slaPolicies.deletedAt),
    ];

    if (options?.priority) {
      conditions.push(
        eq(slaPolicies.priority, options.priority as 'low' | 'medium' | 'high' | 'urgent'),
      );
    }

    if (options?.isActive !== undefined) {
      conditions.push(eq(slaPolicies.isActive, options.isActive === 'true'));
    }

    const result = await this.db
      .select()
      .from(slaPolicies)
      .where(and(...conditions))
      .orderBy(desc(slaPolicies.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [policy] = await this.db
      .select()
      .from(slaPolicies)
      .where(
        and(
          eq(slaPolicies.id, id),
          eq(slaPolicies.tenantId, tenantId),
          isNull(slaPolicies.deletedAt),
        ),
      )
      .limit(1);

    if (!policy) {
      throw new NotFoundException(`SLA policy with ID "${id}" not found`);
    }

    return policy;
  }

  async create(tenantId: string, data: CreateSlaDto) {
    const [policy] = await this.db
      .insert(slaPolicies)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
        priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
        firstResponseHours: data.firstResponseHours,
        resolutionHours: data.resolutionHours,
        isActive: data.isActive ?? true,
        escalateTo: data.escalateTo || null,
      })
      .returning();

    return policy;
  }

  async update(tenantId: string, id: string, data: UpdateSlaDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.firstResponseHours !== undefined) updateData.firstResponseHours = data.firstResponseHours;
    if (data.resolutionHours !== undefined) updateData.resolutionHours = data.resolutionHours;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.escalateTo !== undefined) updateData.escalateTo = data.escalateTo;

    const [updated] = await this.db
      .update(slaPolicies)
      .set(updateData)
      .where(and(eq(slaPolicies.id, id), eq(slaPolicies.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(slaPolicies)
      .set({ deletedAt: new Date() })
      .where(and(eq(slaPolicies.id, id), eq(slaPolicies.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
