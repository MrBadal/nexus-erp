import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  materialRequests,
  materialRequestLines,
  purchaseOrders,
  purchaseOrderLines,
  items,
} from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';
import { BudgetService } from '../../finance/budget/budget.service.js';
import { ApprovalWorkflowService } from '../../shared/approval-workflow.service.js';

export interface CreateMaterialRequestDto {
  requestType?: 'purchase' | 'transfer' | 'manufacture';
  requestDate: string;
  requiredDate?: string;
  department?: string;
  purpose?: string;
  notes?: string;
  lines: {
    itemId: string;
    description?: string;
    quantity: string;
    uom?: string;
    preferredSupplierId?: string;
    warehouseId?: string;
  }[];
}

export interface UpdateMaterialRequestDto {
  requestType?: 'purchase' | 'transfer' | 'manufacture';
  requiredDate?: string;
  department?: string;
  purpose?: string;
  notes?: string;
  lines?: {
    itemId: string;
    description?: string;
    quantity: string;
    uom?: string;
    preferredSupplierId?: string;
    warehouseId?: string;
  }[];
}

@Injectable()
export class MaterialRequestService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
    private readonly budgetService: BudgetService,
    private readonly approvalService: ApprovalWorkflowService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      requestType?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(materialRequests.tenantId, tenantId),
      isNull(materialRequests.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(materialRequests.status, options.status as 'draft' | 'submitted' | 'approved' | 'partially_ordered' | 'ordered' | 'rejected' | 'cancelled'),
      );
    }

    if (options?.requestType) {
      conditions.push(
        eq(materialRequests.requestType, options.requestType as 'purchase' | 'transfer' | 'manufacture'),
      );
    }

    if (options?.search) {
      conditions.push(like(materialRequests.requestNumber, `%${options.search}%`));
    }

    return this.db
      .select()
      .from(materialRequests)
      .where(and(...conditions))
      .orderBy(desc(materialRequests.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [request] = await this.db
      .select()
      .from(materialRequests)
      .where(
        and(
          eq(materialRequests.id, id),
          eq(materialRequests.tenantId, tenantId),
          isNull(materialRequests.deletedAt),
        ),
      )
      .limit(1);

    if (!request) {
      throw new NotFoundException('Material request not found');
    }

    const lines = await this.db
      .select({
        id: materialRequestLines.id,
        itemId: materialRequestLines.itemId,
        description: materialRequestLines.description,
        quantity: materialRequestLines.quantity,
        orderedQty: materialRequestLines.orderedQty,
        uom: materialRequestLines.uom,
        preferredSupplierId: materialRequestLines.preferredSupplierId,
        warehouseId: materialRequestLines.warehouseId,
        itemName: items.name,
        itemCode: items.code,
      })
      .from(materialRequestLines)
      .leftJoin(items, eq(items.id, materialRequestLines.itemId))
      .where(eq(materialRequestLines.materialRequestId, id));

    return { ...request, lines };
  }

  async create(tenantId: string, userId: string, dto: CreateMaterialRequestDto) {
    const requestNumber = await this.numberSeriesService.getNext(tenantId, 'MR');

    const [request] = await this.db
      .insert(materialRequests)
      .values({
        tenantId,
        requestNumber,
        requestType: dto.requestType || 'purchase',
        requestDate: dto.requestDate,
        requiredDate: dto.requiredDate || null,
        department: dto.department || null,
        purpose: dto.purpose || null,
        notes: dto.notes || null,
        requestedBy: userId,
      })
      .returning();

    if (dto.lines?.length) {
      await this.db.insert(materialRequestLines).values(
        dto.lines.map((line) => ({
          materialRequestId: request.id,
          itemId: line.itemId,
          description: line.description || null,
          quantity: line.quantity,
          uom: line.uom || 'Nos',
          preferredSupplierId: line.preferredSupplierId || null,
          warehouseId: line.warehouseId || null,
        })),
      );
    }

    return this.findById(tenantId, request.id);
  }

  async update(tenantId: string, id: string, dto: UpdateMaterialRequestDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft material requests can be updated');
    }

    await this.db
      .update(materialRequests)
      .set({
        requestType: dto.requestType || existing.requestType,
        requiredDate: dto.requiredDate ?? existing.requiredDate,
        department: dto.department ?? existing.department,
        purpose: dto.purpose ?? existing.purpose,
        notes: dto.notes ?? existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, id));

    if (dto.lines) {
      await this.db
        .delete(materialRequestLines)
        .where(eq(materialRequestLines.materialRequestId, id));

      if (dto.lines.length) {
        await this.db.insert(materialRequestLines).values(
          dto.lines.map((line) => ({
            materialRequestId: id,
            itemId: line.itemId,
            description: line.description || null,
            quantity: line.quantity,
            uom: line.uom || 'Nos',
            preferredSupplierId: line.preferredSupplierId || null,
            warehouseId: line.warehouseId || null,
          })),
        );
      }
    }

    return this.findById(tenantId, id);
  }

  async updateStatus(tenantId: string, id: string, status: string, userId?: string) {
    const existing = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['submitted', 'cancelled'],
      submitted: ['approved', 'rejected'],
      approved: ['partially_ordered', 'ordered', 'cancelled'],
      partially_ordered: ['ordered'],
      rejected: ['draft'],
    };

    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${existing.status} to ${status}`);
    }

    if (status === 'submitted') {
      // Estimate cost
      let estimatedCost = 0;
      if (existing.lines?.length) {
        for (const line of existing.lines) {
          estimatedCost += parseFloat(line.quantity) * 100; // Default estimate if no price
        }
      }

      // Budget check
      const budgetCheck = await this.budgetService.checkBudgetAvailability(
        tenantId, estimatedCost, existing.requestDate
      );
      if (!budgetCheck.available) {
        throw new BadRequestException(budgetCheck.message);
      }

      // Try approval workflow
      try {
        await this.approvalService.submitForApproval(tenantId, {
          documentType: 'material_request',
          documentId: existing.id,
          documentNumber: existing.requestNumber,
          requestedBy: userId || existing.requestedBy || '',
          amount: String(estimatedCost),
        });
        await this.db.update(materialRequests).set({ isPendingApproval: true, updatedAt: new Date() })
          .where(eq(materialRequests.id, id));
        return this.findById(tenantId, id);
      } catch {
        // No workflow configured — proceed with normal flow
      }
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'approved' && userId) {
      updates.approvedBy = userId;
      updates.approvedAt = new Date();
    }

    await this.db
      .update(materialRequests)
      .set(updates)
      .where(eq(materialRequests.id, id));

    return this.findById(tenantId, id);
  }

  async convertToPurchaseOrder(tenantId: string, id: string, userId: string) {
    const mr = await this.findById(tenantId, id);

    if (mr.status !== 'approved' && mr.status !== 'partially_ordered') {
      throw new BadRequestException('Only approved material requests can be converted to PO');
    }

    // Filter lines that still need ordering
    const unorderedLines = mr.lines.filter(
      (l) => parseFloat(l.quantity) > parseFloat(l.orderedQty),
    );

    if (unorderedLines.length === 0) {
      throw new BadRequestException('All items in this request have already been ordered');
    }

    // Group by preferred supplier (or null for no preference)
    const bySupplier = new Map<string | null, typeof unorderedLines>();
    for (const line of unorderedLines) {
      const key = line.preferredSupplierId;
      const existing = bySupplier.get(key) || [];
      existing.push(line);
      bySupplier.set(key, existing);
    }

    const createdPOs: string[] = [];

    for (const [supplierId, lines] of bySupplier) {
      if (!supplierId) continue; // Skip lines without a preferred supplier

      const poNumber = await this.numberSeriesService.getNext(tenantId, 'PO');
      const today = new Date().toISOString().split('T')[0];

      let subtotal = 0;
      const poLineValues = lines.map((line) => {
        const remainingQty = parseFloat(line.quantity) - parseFloat(line.orderedQty);
        // Use a placeholder unit price — the PO will need to be edited
        const unitPrice = 0;
        const lineTotal = remainingQty * unitPrice;
        subtotal += lineTotal;

        return {
          itemId: line.itemId,
          description: line.description || line.itemName || '',
          quantity: remainingQty.toFixed(4),
          unitPrice: unitPrice.toFixed(4),
          lineTotal: lineTotal.toFixed(4),
        };
      });

      const [po] = await this.db
        .insert(purchaseOrders)
        .values({
          tenantId,
          orderNumber: poNumber,
          supplierId,
          orderDate: today,
          status: 'draft',
          subtotal: subtotal.toFixed(4),
          totalAmount: subtotal.toFixed(4),
          createdBy: userId,
          notes: `Created from Material Request ${mr.requestNumber}`,
        })
        .returning();

      if (poLineValues.length) {
        await this.db.insert(purchaseOrderLines).values(
          poLineValues.map((l) => ({
            purchaseOrderId: po.id,
            ...l,
          })),
        );
      }

      // Update ordered qty on MR lines
      for (const line of lines) {
        const newOrderedQty = parseFloat(line.quantity); // Fully ordered now
        await this.db
          .update(materialRequestLines)
          .set({ orderedQty: newOrderedQty.toFixed(4) })
          .where(eq(materialRequestLines.id, line.id));
      }

      createdPOs.push(po.id);
    }

    // Check if all lines are now ordered
    const refreshed = await this.findById(tenantId, id);
    const allOrdered = refreshed.lines.every(
      (l) => parseFloat(l.orderedQty) >= parseFloat(l.quantity),
    );

    await this.db
      .update(materialRequests)
      .set({
        status: allOrdered ? 'ordered' : 'partially_ordered',
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, id));

    return {
      purchaseOrderIds: createdPOs,
      totalPOsCreated: createdPOs.length,
      requestStatus: allOrdered ? 'ordered' : 'partially_ordered',
    };
  }

  async softDelete(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft' && existing.status !== 'cancelled') {
      throw new BadRequestException('Only draft or cancelled material requests can be deleted');
    }

    await this.db
      .update(materialRequests)
      .set({ deletedAt: new Date() })
      .where(eq(materialRequests.id, id));
  }
}
