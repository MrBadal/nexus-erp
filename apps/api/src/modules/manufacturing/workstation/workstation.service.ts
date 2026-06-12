import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { workstations } from '../../../database/schema/index.js';
import { CreateWorkstationDto } from './dto/create-workstation.dto.js';
import { UpdateWorkstationDto } from './dto/update-workstation.dto.js';

@Injectable()
export class WorkstationService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      search?: string;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(workstations.tenantId, tenantId),
      isNull(workstations.deletedAt),
    ];

    if (options?.isActive !== undefined) {
      conditions.push(eq(workstations.isActive, options.isActive));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(workstations.name, searchTerm));
    }

    const result = await this.db
      .select()
      .from(workstations)
      .where(and(...conditions))
      .orderBy(desc(workstations.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [workstation] = await this.db
      .select()
      .from(workstations)
      .where(
        and(
          eq(workstations.id, id),
          eq(workstations.tenantId, tenantId),
          isNull(workstations.deletedAt),
        ),
      )
      .limit(1);

    if (!workstation) {
      throw new NotFoundException(`Workstation with ID "${id}" not found`);
    }

    return workstation;
  }

  async create(tenantId: string, data: CreateWorkstationDto) {
    const [workstation] = await this.db
      .insert(workstations)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
        hourlyRate: data.hourlyRate || '0',
        isActive: data.isActive !== undefined ? data.isActive : true,
        productionCapacity: data.productionCapacity || 0,
        workingHours: data.workingHours || '8',
      })
      .returning();

    return workstation;
  }

  async update(tenantId: string, id: string, data: UpdateWorkstationDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.productionCapacity !== undefined) updateData.productionCapacity = data.productionCapacity;
    if (data.workingHours !== undefined) updateData.workingHours = data.workingHours;

    const [updated] = await this.db
      .update(workstations)
      .set(updateData)
      .where(and(eq(workstations.id, id), eq(workstations.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(workstations)
      .set({ deletedAt: new Date() })
      .where(and(eq(workstations.id, id), eq(workstations.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
