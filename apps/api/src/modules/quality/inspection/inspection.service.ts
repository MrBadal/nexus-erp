import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  qualityInspections,
  qualityInspectionReadings,
  purchaseReceipts,
} from '../../../database/schema/index.js';
import { CreateInspectionDto } from './dto/create-inspection.dto.js';
import { UpdateInspectionDto } from './dto/update-inspection.dto.js';
import { EVENTS } from '../../../common/events.constants.js';

@Injectable()
export class InspectionService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      referenceType?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(qualityInspections.tenantId, tenantId),
      isNull(qualityInspections.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(qualityInspections.status, options.status as 'draft' | 'in_progress' | 'accepted' | 'rejected' | 'on_hold'),
      );
    }

    if (options?.referenceType) {
      conditions.push(
        eq(qualityInspections.referenceType, options.referenceType as 'incoming' | 'in_process' | 'outgoing'),
      );
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(qualityInspections.inspectionNumber, searchTerm));
    }

    const result = await this.db
      .select()
      .from(qualityInspections)
      .where(and(...conditions))
      .orderBy(desc(qualityInspections.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [inspection] = await this.db
      .select()
      .from(qualityInspections)
      .where(
        and(
          eq(qualityInspections.id, id),
          eq(qualityInspections.tenantId, tenantId),
          isNull(qualityInspections.deletedAt),
        ),
      )
      .limit(1);

    if (!inspection) {
      throw new NotFoundException(`Quality inspection with ID "${id}" not found`);
    }

    const readings = await this.db
      .select()
      .from(qualityInspectionReadings)
      .where(eq(qualityInspectionReadings.inspectionId, id));

    return { ...inspection, readings };
  }

  async create(tenantId: string, data: CreateInspectionDto) {
    // Incoming inspections must reference a valid purchase receipt
    if (data.referenceType === 'incoming') {
      if (!data.referenceId) {
        throw new BadRequestException(
          'Incoming inspections require a referenceId pointing to a purchase receipt (GRN)',
        );
      }
      const [grn] = await this.db
        .select({ id: purchaseReceipts.id, warehouseId: purchaseReceipts.warehouseId })
        .from(purchaseReceipts)
        .where(
          and(
            eq(purchaseReceipts.id, data.referenceId),
            eq(purchaseReceipts.tenantId, tenantId),
            isNull(purchaseReceipts.deletedAt),
          ),
        )
        .limit(1);
      if (!grn) {
        throw new BadRequestException(
          `Incoming inspection references unknown purchase receipt ${data.referenceId}`,
        );
      }
    }

    const inspectionNumber = await this.generateInspectionNumber(tenantId);

    const [inspection] = await this.db
      .insert(qualityInspections)
      .values({
        tenantId,
        inspectionNumber,
        referenceType: data.referenceType as 'incoming' | 'in_process' | 'outgoing',
        referenceId: data.referenceId || null,
        referenceName: data.referenceName || null,
        itemId: data.itemId || null,
        itemName: data.itemName || null,
        inspectedBy: data.inspectedBy || null,
        inspectionDate: data.inspectionDate,
        status: 'draft',
        batchNumber: data.batchNumber || null,
        sampleSize: data.sampleSize || null,
        acceptedQuantity: data.acceptedQuantity || null,
        rejectedQuantity: data.rejectedQuantity || null,
        remarks: data.remarks || null,
      })
      .returning();

    // Insert readings if provided
    if (data.readings && data.readings.length > 0) {
      await this.db.insert(qualityInspectionReadings).values(
        data.readings.map((reading) => ({
          tenantId,
          inspectionId: inspection.id,
          parameter: reading.parameter,
          specification: reading.specification || null,
          minValue: reading.minValue || null,
          maxValue: reading.maxValue || null,
          actualValue: reading.actualValue || null,
          status: (reading.status as 'accepted' | 'rejected') || 'accepted',
          remarks: reading.remarks || null,
        })),
      );
    }

    return this.findById(tenantId, inspection.id);
  }

  async update(tenantId: string, id: string, data: UpdateInspectionDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft' && existing.status !== 'in_progress') {
      throw new BadRequestException('Only draft or in-progress inspections can be updated');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.referenceType !== undefined) updateData.referenceType = data.referenceType;
    if (data.referenceId !== undefined) updateData.referenceId = data.referenceId;
    if (data.referenceName !== undefined) updateData.referenceName = data.referenceName;
    if (data.itemId !== undefined) updateData.itemId = data.itemId;
    if (data.itemName !== undefined) updateData.itemName = data.itemName;
    if (data.inspectedBy !== undefined) updateData.inspectedBy = data.inspectedBy;
    if (data.inspectionDate !== undefined) updateData.inspectionDate = data.inspectionDate;
    if (data.batchNumber !== undefined) updateData.batchNumber = data.batchNumber;
    if (data.sampleSize !== undefined) updateData.sampleSize = data.sampleSize;
    if (data.acceptedQuantity !== undefined) updateData.acceptedQuantity = data.acceptedQuantity;
    if (data.rejectedQuantity !== undefined) updateData.rejectedQuantity = data.rejectedQuantity;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;

    const [updated] = await this.db
      .update(qualityInspections)
      .set(updateData)
      .where(and(eq(qualityInspections.id, id), eq(qualityInspections.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'in_progress' | 'accepted' | 'rejected' | 'on_hold',
  ) {
    const inspection = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['in_progress', 'accepted', 'rejected', 'on_hold'],
      in_progress: ['accepted', 'rejected', 'on_hold'],
      on_hold: ['in_progress', 'accepted', 'rejected'],
    };

    const allowed = validTransitions[inspection.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${inspection.status}" to "${newStatus}"`,
      );
    }

    const [updated] = await this.db
      .update(qualityInspections)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(qualityInspections.id, id), eq(qualityInspections.tenantId, tenantId)))
      .returning();

    if (newStatus === 'rejected' && inspection.itemId) {
      // Resolve source warehouse from linked GRN if incoming, else null
      let sourceWarehouseId: string | null = null;
      if (inspection.referenceType === 'incoming' && inspection.referenceId) {
        const [grn] = await this.db
          .select({ warehouseId: purchaseReceipts.warehouseId })
          .from(purchaseReceipts)
          .where(eq(purchaseReceipts.id, inspection.referenceId))
          .limit(1);
        if (grn) sourceWarehouseId = grn.warehouseId;
      }

      const rejectedQty = inspection.rejectedQuantity ?? 0;
      if (rejectedQty > 0 && sourceWarehouseId) {
        this.eventEmitter.emit(EVENTS.INSPECTION_REJECTED, {
          inspectionId: inspection.id,
          tenantId,
          itemId: inspection.itemId,
          quantity: rejectedQty,
          sourceWarehouseId,
        });
      }
    }

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const inspection = await this.findById(tenantId, id);

    if (inspection.status !== 'draft') {
      throw new BadRequestException('Only draft inspections can be deleted');
    }

    const [deleted] = await this.db
      .update(qualityInspections)
      .set({ deletedAt: new Date() })
      .where(and(eq(qualityInspections.id, id), eq(qualityInspections.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  private async generateInspectionNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QI-${year}-`;

    const [latest] = await this.db
      .select({ inspectionNumber: qualityInspections.inspectionNumber })
      .from(qualityInspections)
      .where(
        and(
          eq(qualityInspections.tenantId, tenantId),
          like(qualityInspections.inspectionNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${qualityInspections.inspectionNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.inspectionNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
