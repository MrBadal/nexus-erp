import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { assets, employees } from '../../../database/schema/index.js';
import {
  assetAssignments,
  type NewAssetAssignment,
} from '../../../database/schema/hr-asset-assignment.js';
import { AssignAssetDto } from './dto/assign-asset.dto.js';
import { ReturnAssetDto } from './dto/return-asset.dto.js';

@Injectable()
export class AssetAssignmentService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ─── Reads ──────────────────────────────────────────────

  async findAll(
    tenantId: string,
    options?: {
      assetId?: string;
      employeeId?: string;
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [eq(assetAssignments.tenantId, tenantId)];

    if (options?.assetId) {
      conditions.push(eq(assetAssignments.assetId, options.assetId));
    }
    if (options?.employeeId) {
      conditions.push(eq(assetAssignments.employeeId, options.employeeId));
    }
    if (options?.activeOnly) {
      conditions.push(isNull(assetAssignments.returnedAt));
    }

    return this.db
      .select()
      .from(assetAssignments)
      .where(and(...conditions))
      .orderBy(desc(assetAssignments.assignedAt))
      .limit(options?.limit ?? 100)
      .offset(options?.offset ?? 0);
  }

  async findById(tenantId: string, id: string) {
    const [record] = await this.db
      .select()
      .from(assetAssignments)
      .where(
        and(
          eq(assetAssignments.id, id),
          eq(assetAssignments.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!record) {
      throw new NotFoundException(`Asset assignment "${id}" not found`);
    }
    return record;
  }

  async findByEmployee(tenantId: string, employeeId: string) {
    return this.findAll(tenantId, { employeeId });
  }

  async findByAsset(tenantId: string, assetId: string) {
    return this.findAll(tenantId, { assetId });
  }

  async findActiveAssignmentForAsset(tenantId: string, assetId: string) {
    const [record] = await this.db
      .select()
      .from(assetAssignments)
      .where(
        and(
          eq(assetAssignments.tenantId, tenantId),
          eq(assetAssignments.assetId, assetId),
          isNull(assetAssignments.returnedAt),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  // ─── Writes ─────────────────────────────────────────────

  async assign(
    tenantId: string,
    data: AssignAssetDto,
    userId: string | null,
  ) {
    // Validate asset
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

    // Validate employee
    const [employee] = await this.db
      .select()
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
      throw new BadRequestException('Employee not found');
    }

    // Disallow double-assignment
    const active = await this.findActiveAssignmentForAsset(tenantId, data.assetId);
    if (active) {
      throw new ConflictException(
        'Asset is already assigned. Return the existing assignment first.',
      );
    }

    const values: NewAssetAssignment = {
      tenantId,
      assetId: data.assetId,
      employeeId: data.employeeId,
      conditionAtAssign: data.conditionAtAssign ?? null,
      notes: data.notes ?? null,
      createdBy: userId,
    };

    const [created] = await this.db
      .insert(assetAssignments)
      .values(values)
      .returning();

    return created;
  }

  async returnAssignment(tenantId: string, id: string, data: ReturnAssetDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.returnedAt) {
      throw new ConflictException('Assignment has already been returned');
    }

    const updateData: Record<string, unknown> = {
      returnedAt: new Date(),
    };
    if (data.conditionAtReturn !== undefined) {
      updateData.conditionAtReturn = data.conditionAtReturn;
    }
    if (data.notes !== undefined && data.notes !== null) {
      // Append return notes to existing notes
      updateData.notes = existing.notes
        ? `${existing.notes}\n[return] ${data.notes}`
        : `[return] ${data.notes}`;
    }

    const [updated] = await this.db
      .update(assetAssignments)
      .set(updateData)
      .where(
        and(
          eq(assetAssignments.id, id),
          eq(assetAssignments.tenantId, tenantId),
        ),
      )
      .returning();

    return updated;
  }
}
