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
  workOrders,
  workOrderOperations,
  boms,
  bomItems,
  itemWarehouses,
} from '../../../database/schema/index.js';
import { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto.js';
import { EVENTS } from '../../../common/events.constants.js';

@Injectable()
export class WorkOrderService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      priority?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(workOrders.tenantId, tenantId),
      isNull(workOrders.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(workOrders.status, options.status as 'draft' | 'not_started' | 'in_progress' | 'completed' | 'stopped' | 'cancelled'),
      );
    }

    if (options?.priority) {
      conditions.push(
        eq(workOrders.priority, options.priority as 'low' | 'medium' | 'high' | 'urgent'),
      );
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(workOrders.workOrderNumber, searchTerm));
    }

    const result = await this.db
      .select()
      .from(workOrders)
      .where(and(...conditions))
      .orderBy(desc(workOrders.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [order] = await this.db
      .select()
      .from(workOrders)
      .where(
        and(
          eq(workOrders.id, id),
          eq(workOrders.tenantId, tenantId),
          isNull(workOrders.deletedAt),
        ),
      )
      .limit(1);

    if (!order) {
      throw new NotFoundException(`Work order with ID "${id}" not found`);
    }

    const ops = await this.db
      .select()
      .from(workOrderOperations)
      .where(eq(workOrderOperations.workOrderId, id));

    return { ...order, operations: ops };
  }

  async create(tenantId: string, data: CreateWorkOrderDto) {
    // Validate BOM exists
    const [bom] = await this.db
      .select()
      .from(boms)
      .where(
        and(
          eq(boms.id, data.bomId),
          eq(boms.tenantId, tenantId),
          isNull(boms.deletedAt),
        ),
      )
      .limit(1);

    if (!bom) {
      throw new BadRequestException('BOM not found');
    }

    const workOrderNumber = await this.generateWorkOrderNumber(tenantId);
    const qty = parseFloat(data.quantity);

    const [order] = await this.db
      .insert(workOrders)
      .values({
        tenantId,
        workOrderNumber,
        bomId: data.bomId,
        itemId: data.itemId,
        itemName: data.itemName,
        quantity: data.quantity,
        pendingQty: qty.toFixed(4),
        completedQty: '0',
        uom: data.uom || 'Nos',
        plannedStartDate: data.plannedStartDate || null,
        plannedEndDate: data.plannedEndDate || null,
        status: 'draft',
        priority: (data.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
        warehouse: data.warehouse || null,
        description: data.description || null,
      })
      .returning();

    // Insert operations
    if (data.operations && data.operations.length > 0) {
      await this.db.insert(workOrderOperations).values(
        data.operations.map((op, index) => ({
          tenantId,
          workOrderId: order.id,
          operationName: op.operationName,
          workstation: op.workstation || null,
          plannedTime: op.plannedTime || '0',
          actualTime: '0',
          status: 'pending' as const,
          sequence: index + 1,
          description: op.description || null,
        })),
      );
    }

    return this.findById(tenantId, order.id);
  }

  async update(tenantId: string, id: string, data: UpdateWorkOrderDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft work orders can be updated');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
      updateData.pendingQty = data.quantity;
    }
    if (data.plannedStartDate !== undefined) updateData.plannedStartDate = data.plannedStartDate;
    if (data.plannedEndDate !== undefined) updateData.plannedEndDate = data.plannedEndDate;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.warehouse !== undefined) updateData.warehouse = data.warehouse;
    if (data.description !== undefined) updateData.description = data.description;

    const [updated] = await this.db
      .update(workOrders)
      .set(updateData)
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'not_started' | 'in_progress' | 'completed' | 'stopped' | 'cancelled',
  ) {
    const order = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['not_started', 'cancelled'],
      not_started: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'stopped', 'cancelled'],
      stopped: ['in_progress', 'cancelled'],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${order.status}" to "${newStatus}"`,
      );
    }

    const updateValues: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'in_progress') {
      const check = await this.checkMaterialAvailability(tenantId, id);
      if (check.shortages.length > 0) {
        const details = check.shortages
          .map((s) => `item ${s.itemId}: required ${s.required}, available ${s.available}`)
          .join('; ');
        throw new BadRequestException(
          `Cannot start work order — material shortages: ${details}`,
        );
      }
      if (!order.actualStartDate) {
        updateValues.actualStartDate = new Date().toISOString().split('T')[0];
      }
    }

    if (newStatus === 'completed') {
      updateValues.actualEndDate = new Date().toISOString().split('T')[0];
      updateValues.completedQty = order.quantity;
      updateValues.pendingQty = '0';
    }

    const [updated] = await this.db
      .update(workOrders)
      .set(updateValues)
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)))
      .returning();

    if (newStatus === 'completed') {
      // Fetch BOM items to determine which raw materials to consume
      const materials = await this.db
        .select()
        .from(bomItems)
        .where(and(eq(bomItems.bomId, order.bomId), isNull(bomItems.deletedAt)));

      this.eventEmitter.emit(EVENTS.WORK_ORDER_COMPLETED, {
        orderId: order.id,
        tenantId,
        workOrderNumber: order.workOrderNumber,
        bomId: order.bomId,
        finishedItemId: order.itemId,
        finishedItemName: order.itemName,
        completedQty: order.quantity,
        materials: materials.map((m) => ({
          itemId: m.itemId,
          quantity: (parseFloat(m.quantity) * parseFloat(order.quantity)).toFixed(4),
          rate: m.rate,
        })),
      });
    }

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);

    if (order.status === 'in_progress') {
      throw new BadRequestException('In-progress work orders cannot be deleted');
    }

    const [deleted] = await this.db
      .update(workOrders)
      .set({ deletedAt: new Date() })
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  /**
   * Checks BOM material availability across all warehouses for a given work order.
   * Returns shortages list (item required > total available).
   */
  async checkMaterialAvailability(
    tenantId: string,
    woId: string,
  ): Promise<{ shortages: { itemId: string; required: number; available: number }[] }> {
    const wo = await this.findById(tenantId, woId);
    const woQty = parseFloat(wo.quantity);

    const materials = await this.db
      .select()
      .from(bomItems)
      .where(and(eq(bomItems.bomId, wo.bomId), isNull(bomItems.deletedAt)));

    const shortages: { itemId: string; required: number; available: number }[] = [];

    for (const mat of materials) {
      const required = parseFloat(mat.quantity) * woQty;
      if (required <= 0) continue;

      const stocks = await this.db
        .select({ qty: itemWarehouses.quantity, reserved: itemWarehouses.reservedQuantity })
        .from(itemWarehouses)
        .where(and(eq(itemWarehouses.tenantId, tenantId), eq(itemWarehouses.itemId, mat.itemId)));

      const available = stocks.reduce(
        (sum, s) => sum + (parseFloat(s.qty) - parseFloat(s.reserved)),
        0,
      );

      if (available < required) {
        shortages.push({ itemId: mat.itemId, required, available });
      }
    }

    return { shortages };
  }

  private async generateWorkOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `MO-${year}-`;

    const [latest] = await this.db
      .select({ workOrderNumber: workOrders.workOrderNumber })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.tenantId, tenantId),
          like(workOrders.workOrderNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${workOrders.workOrderNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.workOrderNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
