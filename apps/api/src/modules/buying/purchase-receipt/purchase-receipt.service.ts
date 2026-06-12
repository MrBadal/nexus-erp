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
  purchaseReceipts,
  purchaseReceiptLines,
  purchaseOrderLines,
  purchaseOrders,
  suppliers,
  items,
} from '../../../database/schema/index.js';
import { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto.js';
import { EVENTS } from '../../../common/events.constants.js';

@Injectable()
export class PurchaseReceiptService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      supplierId?: string;
      purchaseOrderId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(purchaseReceipts.tenantId, tenantId),
      isNull(purchaseReceipts.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(purchaseReceipts.status, options.status as 'draft' | 'submitted' | 'completed'),
      );
    }

    if (options?.supplierId) {
      conditions.push(eq(purchaseReceipts.supplierId, options.supplierId));
    }

    if (options?.purchaseOrderId) {
      conditions.push(eq(purchaseReceipts.purchaseOrderId, options.purchaseOrderId));
    }

    if (options?.search) {
      conditions.push(like(purchaseReceipts.receiptNumber, `%${options.search}%`));
    }

    return this.db
      .select()
      .from(purchaseReceipts)
      .where(and(...conditions))
      .orderBy(desc(purchaseReceipts.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [receipt] = await this.db
      .select()
      .from(purchaseReceipts)
      .where(
        and(
          eq(purchaseReceipts.id, id),
          eq(purchaseReceipts.tenantId, tenantId),
          isNull(purchaseReceipts.deletedAt),
        ),
      )
      .limit(1);

    if (!receipt) {
      throw new NotFoundException(`Purchase receipt with ID "${id}" not found`);
    }

    const lines = await this.db
      .select()
      .from(purchaseReceiptLines)
      .where(eq(purchaseReceiptLines.purchaseReceiptId, id));

    return { ...receipt, lines };
  }

  async create(tenantId: string, data: CreatePurchaseReceiptDto) {
    const [supplier] = await this.db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, data.supplierId),
          eq(suppliers.tenantId, tenantId),
          isNull(suppliers.deletedAt),
        ),
      )
      .limit(1);

    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    const receiptNumber = await this.generateNumber(tenantId);

    const [receipt] = await this.db
      .insert(purchaseReceipts)
      .values({
        tenantId,
        receiptNumber,
        purchaseOrderId: data.purchaseOrderId || null,
        supplierId: data.supplierId,
        receiptDate: data.receiptDate,
        status: 'draft',
        warehouseId: data.warehouseId,
        notes: data.notes || null,
      })
      .returning();

    if (data.lines.length > 0) {
      await this.db.insert(purchaseReceiptLines).values(
        data.lines.map((line) => ({
          purchaseReceiptId: receipt.id,
          purchaseOrderLineId: line.purchaseOrderLineId || null,
          itemId: line.itemId,
          acceptedQty: line.acceptedQty,
          rejectedQty: line.rejectedQty || '0',
          rejectedReason: line.rejectedReason || null,
        })),
      );
    }

    return this.findById(tenantId, receipt.id);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'submitted' | 'completed',
  ) {
    const receipt = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['submitted'],
      submitted: ['completed'],
    };

    const allowed = validTransitions[receipt.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${receipt.status}" to "${newStatus}"`,
      );
    }

    const [updated] = await this.db
      .update(purchaseReceipts)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(purchaseReceipts.id, id), eq(purchaseReceipts.tenantId, tenantId)))
      .returning();

    // When GRN is completed, trigger inventory update + AP accrual journal
    if (newStatus === 'completed') {
      // Enrich lines with item purchase prices for accurate GL posting
      const enrichedLines = await Promise.all(
        receipt.lines.map(async (line) => {
          const [item] = await this.db
            .select({ purchasePrice: items.purchasePrice })
            .from(items)
            .where(eq(items.id, line.itemId))
            .limit(1);

          return {
            itemId: line.itemId,
            acceptedQty: line.acceptedQty,
            unitCost: item?.purchasePrice || '0',
          };
        }),
      );

      this.eventEmitter.emit(EVENTS.PURCHASE_RECEIPT_COMPLETED, {
        receiptId: id,
        tenantId,
        receiptNumber: receipt.receiptNumber,
        supplierId: receipt.supplierId,
        warehouseId: receipt.warehouseId,
        lines: enrichedLines,
      });

      // Update PO line receivedQty and PO status
      if (receipt.purchaseOrderId) {
        await this.updatePurchaseOrderReceivedQty(tenantId, receipt);
      }
    }

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const receipt = await this.findById(tenantId, id);

    if (receipt.status !== 'draft') {
      throw new BadRequestException('Only draft receipts can be deleted');
    }

    const [deleted] = await this.db
      .update(purchaseReceipts)
      .set({ deletedAt: new Date() })
      .where(and(eq(purchaseReceipts.id, id), eq(purchaseReceipts.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  /**
   * Update PO line receivedQty based on GRN accepted quantities.
   * Also updates PO status to 'received' if fully received, or 'partially_received'.
   */
  private async updatePurchaseOrderReceivedQty(
    tenantId: string,
    receipt: { purchaseOrderId: string | null; lines: { purchaseOrderLineId?: string | null; acceptedQty: string }[] },
  ) {
    if (!receipt.purchaseOrderId) return;

    // Update each PO line's receivedQty
    for (const line of receipt.lines) {
      if (!line.purchaseOrderLineId) continue;

      // Increment receivedQty on the PO line
      await this.db
        .update(purchaseOrderLines)
        .set({
          receivedQty: sql`CAST(${purchaseOrderLines.receivedQty} AS numeric) + ${parseFloat(line.acceptedQty)}`,
        })
        .where(eq(purchaseOrderLines.id, line.purchaseOrderLineId));
    }

    // Check if all PO lines are fully received
    const poLines = await this.db
      .select({
        quantity: purchaseOrderLines.quantity,
        receivedQty: purchaseOrderLines.receivedQty,
      })
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, receipt.purchaseOrderId));

    const allReceived = poLines.every(
      (l) => parseFloat(l.receivedQty) >= parseFloat(l.quantity),
    );
    const someReceived = poLines.some(
      (l) => parseFloat(l.receivedQty) > 0,
    );

    const newStatus = allReceived ? 'received' : someReceived ? 'partially_received' : undefined;

    if (newStatus) {
      await this.db
        .update(purchaseOrders)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(
          and(
            eq(purchaseOrders.id, receipt.purchaseOrderId),
            eq(purchaseOrders.tenantId, tenantId),
          ),
        );
    }
  }

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `GRN-${year}-`;

    const [latest] = await this.db
      .select({ receiptNumber: purchaseReceipts.receiptNumber })
      .from(purchaseReceipts)
      .where(
        and(
          eq(purchaseReceipts.tenantId, tenantId),
          like(purchaseReceipts.receiptNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${purchaseReceipts.receiptNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.receiptNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) sequence = lastNum + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
