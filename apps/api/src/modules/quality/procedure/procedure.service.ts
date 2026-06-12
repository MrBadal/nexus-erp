import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { qualityProcedures } from '../../../database/schema/index.js';
import { CreateProcedureDto } from './dto/create-procedure.dto.js';
import { UpdateProcedureDto } from './dto/update-procedure.dto.js';

@Injectable()
export class ProcedureService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      isActive?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(qualityProcedures.tenantId, tenantId),
      isNull(qualityProcedures.deletedAt),
    ];

    if (options?.isActive !== undefined) {
      conditions.push(eq(qualityProcedures.isActive, options.isActive));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(qualityProcedures.name, searchTerm));
    }

    const result = await this.db
      .select()
      .from(qualityProcedures)
      .where(and(...conditions))
      .orderBy(desc(qualityProcedures.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [procedure] = await this.db
      .select()
      .from(qualityProcedures)
      .where(
        and(
          eq(qualityProcedures.id, id),
          eq(qualityProcedures.tenantId, tenantId),
          isNull(qualityProcedures.deletedAt),
        ),
      )
      .limit(1);

    if (!procedure) {
      throw new NotFoundException(`Quality procedure with ID "${id}" not found`);
    }

    return procedure;
  }

  async create(tenantId: string, data: CreateProcedureDto) {
    const [procedure] = await this.db
      .insert(qualityProcedures)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
        processOwner: data.processOwner || null,
        isActive: data.isActive ?? true,
        steps: data.steps || null,
      })
      .returning();

    return procedure;
  }

  async update(tenantId: string, id: string, data: UpdateProcedureDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.processOwner !== undefined) updateData.processOwner = data.processOwner;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.steps !== undefined) updateData.steps = data.steps;

    const [updated] = await this.db
      .update(qualityProcedures)
      .set(updateData)
      .where(and(eq(qualityProcedures.id, id), eq(qualityProcedures.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(qualityProcedures)
      .set({ deletedAt: new Date() })
      .where(and(eq(qualityProcedures.id, id), eq(qualityProcedures.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
