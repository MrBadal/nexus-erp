import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  assetMaintenance,
  assets,
} from '../../../database/schema/index.js';
import { CreateAssetMaintenanceDto } from './dto/create-asset-maintenance.dto.js';
import { UpdateAssetMaintenanceDto } from './dto/update-asset-maintenance.dto.js';

@Injectable()
export class AssetMaintenanceService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      assetId?: string;
      maintenanceType?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(assetMaintenance.tenantId, tenantId),
      isNull(assetMaintenance.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(assetMaintenance.status, options.status as 'planned' | 'in_progress' | 'completed' | 'overdue'),
      );
    }

    if (options?.assetId) {
      conditions.push(eq(assetMaintenance.assetId, options.assetId));
    }

    if (options?.maintenanceType) {
      conditions.push(
        eq(assetMaintenance.maintenanceType, options.maintenanceType as 'preventive' | 'corrective' | 'calibration' | 'inspection'),
      );
    }

    const result = await this.db
      .select()
      .from(assetMaintenance)
      .where(and(...conditions))
      .orderBy(desc(assetMaintenance.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [record] = await this.db
      .select()
      .from(assetMaintenance)
      .where(
        and(
          eq(assetMaintenance.id, id),
          eq(assetMaintenance.tenantId, tenantId),
          isNull(assetMaintenance.deletedAt),
        ),
      )
      .limit(1);

    if (!record) {
      throw new NotFoundException(`Maintenance record with ID "${id}" not found`);
    }

    return record;
  }

  async create(tenantId: string, data: CreateAssetMaintenanceDto) {
    // Validate asset exists
    const [asset] = await this.db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, data.assetId),
          eq(assets.tenantId, tenantId),
          isNull(assets.deletedAt),
        ),
      )
      .limit(1);

    if (!asset) {
      throw new BadRequestException('Asset not found');
    }

    const [record] = await this.db
      .insert(assetMaintenance)
      .values({
        tenantId,
        assetId: data.assetId,
        maintenanceType: (data.maintenanceType as 'preventive' | 'corrective' | 'calibration' | 'inspection') || 'preventive',
        maintenanceDate: data.maintenanceDate,
        nextMaintenanceDate: data.nextMaintenanceDate || null,
        cost: data.cost || '0',
        performedBy: data.performedBy || null,
        description: data.description || null,
        status: 'planned',
      })
      .returning();

    return record;
  }

  async update(tenantId: string, id: string, data: UpdateAssetMaintenanceDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.maintenanceType !== undefined) updateData.maintenanceType = data.maintenanceType;
    if (data.maintenanceDate !== undefined) updateData.maintenanceDate = data.maintenanceDate;
    if (data.nextMaintenanceDate !== undefined) updateData.nextMaintenanceDate = data.nextMaintenanceDate;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.performedBy !== undefined) updateData.performedBy = data.performedBy;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    const [updated] = await this.db
      .update(assetMaintenance)
      .set(updateData)
      .where(and(eq(assetMaintenance.id, id), eq(assetMaintenance.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(assetMaintenance)
      .set({ deletedAt: new Date() })
      .where(and(eq(assetMaintenance.id, id), eq(assetMaintenance.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
