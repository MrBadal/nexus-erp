import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  purchaseOrders,
  purchaseOrderLines,
  poAmendments,
  suppliers,
  bills,
  billLines,
  purchaseReceipts,
  purchaseReceiptLines,
} from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';
import { ApprovalWorkflowService } from '../../shared/approval-workflow.service.js';
import { BudgetService } from '../../finance/budget/budget.service.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto.js';
import { AuditService } from '../../audit/audit.service.js';

const APPROVAL_THRESHOLD_INR = 100000;

@Injectable()
export class PurchaseOrderService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
    private readonly budgetService: BudgetService,
    private readonly auditService: AuditService,
    private readonly approvalService: ApprovalWorkflowService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      supplierId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(purchaseOrders.tenantId, tenantId),
      isNull(purchaseOrders.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(purchaseOrders.status, options.status as 'draft' | 'submitted' | 'approved' | 'received' | 'partially_received' | 'cancelled'),
      );
    }

    if (options?.supplierId) {
      conditions.push(eq(purchaseOrders.supplierId, options.supplierId));
    }

    if (options?.search) {
      conditions.push(like(purchaseOrders.orderNumber, `%${options.search}%`));
    }

    return this.db
      .select()
      .from(purchaseOrders)
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [order] = await this.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.tenantId, tenantId),
          isNull(purchaseOrders.deletedAt),
        ),
      )
      .limit(1);

    if (!order) {
      throw new NotFoundException(`Purchase order with ID "${id}" not found`);
    }

    const lines = await this.db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, id));

    return { ...order, lines };
  }

  async create(tenantId: string, data: CreatePurchaseOrderDto) {
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

    const orderNumber = await this.generateNumber(tenantId);

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const lineData = data.lines.map((line) => {
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      const discount = parseFloat(line.discount || '0');
      const taxRate = parseFloat(line.taxRate || '0');
      const lineSub = qty * price;
      const lineDiscAmt = lineSub * (discount / 100);
      const lineTaxAmt = (lineSub - lineDiscAmt) * (taxRate / 100);
      const lineTotal = lineSub - lineDiscAmt + lineTaxAmt;

      subtotal += lineSub;
      totalDiscount += lineDiscAmt;
      totalTax += lineTaxAmt;

      return { ...line, lineTotal: lineTotal.toFixed(4) };
    });

    const totalAmount = subtotal - totalDiscount + totalTax;

    const [order] = await this.db
      .insert(purchaseOrders)
      .values({
        tenantId,
        orderNumber,
        supplierId: data.supplierId,
        orderDate: data.orderDate,
        expectedDelivery: data.expectedDelivery || null,
        status: 'draft',
        subtotal: subtotal.toFixed(4),
        taxAmount: totalTax.toFixed(4),
        discountAmount: totalDiscount.toFixed(4),
        totalAmount: totalAmount.toFixed(4),
        notes: data.notes || null,
      })
      .returning();

    if (lineData.length > 0) {
      await this.db.insert(purchaseOrderLines).values(
        lineData.map((line) => ({
          purchaseOrderId: order.id,
          itemId: line.itemId,
          description: line.description || null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount || '0',
          taxRate: line.taxRate || '0',
          lineTotal: line.lineTotal,
        })),
      );
    }

    await this.auditService.logAction({
      tenantId,
      action: 'create',
      entityType: 'purchase_order',
      entityId: order.id,
      changes: { after: { orderNumber, supplierId: data.supplierId, totalAmount: totalAmount.toFixed(4) } },
    });

    return this.findById(tenantId, order.id);
  }

  async update(tenantId: string, id: string, data: UpdatePurchaseOrderDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft purchase orders can be updated');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.expectedDelivery !== undefined) updateData.expectedDelivery = data.expectedDelivery;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updated] = await this.db
      .update(purchaseOrders)
      .set(updateData)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'submitted' | 'approved' | 'received' | 'partially_received' | 'cancelled',
    userId?: string,
  ) {
    const order = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['submitted', 'cancelled'],
      submitted: ['approved', 'cancelled'],
      approved: ['received', 'partially_received', 'cancelled'],
      partially_received: ['received'],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${order.status}" to "${newStatus}"`,
      );
    }

    if (newStatus === 'submitted') {
      const budgetCheck = await this.budgetService.checkBudgetAvailability(
        tenantId, parseFloat(order.totalAmount), order.orderDate
      );
      if (!budgetCheck.available) {
        throw new BadRequestException(budgetCheck.message);
      }

      // Route for approval if total exceeds threshold
      const totalAmt = parseFloat(order.totalAmount);
      if (totalAmt > APPROVAL_THRESHOLD_INR) {
        const requester = userId || order.createdBy;
        if (requester) {
          try {
            await this.approvalService.submitForApproval(tenantId, {
              documentType: 'purchase_order',
              documentId: order.id,
              documentNumber: order.orderNumber,
              requestedBy: requester,
              amount: order.totalAmount,
            });
          } catch (err) {
            // If no workflow configured, proceed without approval routing
            if (!(err instanceof BadRequestException)) throw err;
          }
        }

        const [updatedPending] = await this.db
          .update(purchaseOrders)
          .set({ status: 'submitted', isPendingApproval: true, updatedAt: new Date() })
          .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
          .returning();

        await this.auditService.logAction({
          tenantId,
          action: 'update',
          entityType: 'purchase_order',
          entityId: id,
          changes: { from: order.status, to: 'submitted', pendingApproval: true, orderNumber: order.orderNumber },
        });

        return updatedPending;
      }
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'approved') {
      updateData.approvedAt = new Date();
    }

    const [updated] = await this.db
      .update(purchaseOrders)
      .set(updateData)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .returning();

    await this.auditService.logAction({
      tenantId,
      action: 'update',
      entityType: 'purchase_order',
      entityId: id,
      changes: { from: order.status, to: newStatus, orderNumber: order.orderNumber },
    });

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);

    if (order.status !== 'draft') {
      throw new BadRequestException('Only draft purchase orders can be deleted');
    }

    const [deleted] = await this.db
      .update(purchaseOrders)
      .set({ deletedAt: new Date() })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  /**
   * Creates a bill from an approved/received purchase order.
   * Copies PO lines → bill lines, links via purchaseOrderId.
   */
  async createBill(tenantId: string, id: string, userId: string) {
    const po = await this.findById(tenantId, id);

    if (po.status !== 'approved' && po.status !== 'received' && po.status !== 'partially_received') {
      throw new BadRequestException(
        `Only approved or received purchase orders can have bills created. Current status: ${po.status}`,
      );
    }

    // Check if a bill already exists for this PO
    const [existingBill] = await this.db
      .select({ id: bills.id })
      .from(bills)
      .where(
        and(
          eq(bills.purchaseOrderId, id),
          eq(bills.tenantId, tenantId),
          isNull(bills.deletedAt),
        ),
      )
      .limit(1);

    if (existingBill) {
      throw new BadRequestException('A bill already exists for this purchase order');
    }

    const billNumber = await this.numberSeriesService.getNext(tenantId, 'bill');
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);

    // Calculate totals from PO lines
    let subtotal = 0;
    let totalTax = 0;

    const billLineData = po.lines.map((poLine, idx) => {
      const qty = parseFloat(poLine.quantity);
      const price = parseFloat(poLine.unitPrice);
      const discountPct = parseFloat(poLine.discount || '0');
      const taxRate = parseFloat(poLine.taxRate || '0');
      const lineSubtotal = qty * price;
      const lineDiscountAmt = lineSubtotal * (discountPct / 100);
      const taxableAmount = lineSubtotal - lineDiscountAmt;
      const lineTaxAmt = taxableAmount * (taxRate / 100);
      const lineTotal = taxableAmount + lineTaxAmt;

      subtotal += taxableAmount;
      totalTax += lineTaxAmt;

      return {
        lineNumber: idx + 1,
        itemId: poLine.itemId,
        purchaseOrderLineId: poLine.id,
        description: poLine.description,
        quantity: qty.toFixed(4),
        unitPrice: price.toFixed(4),
        discountType: discountPct > 0 ? ('percentage' as const) : null,
        discountValue: discountPct > 0 ? discountPct.toFixed(4) : '0',
        taxAmount: lineTaxAmt.toFixed(4),
        lineTotal: lineTotal.toFixed(4),
      };
    });

    const total = subtotal + totalTax;

    const [bill] = await this.db
      .insert(bills)
      .values({
        tenantId,
        billNumber,
        vendorId: po.supplierId,
        purchaseOrderId: id,
        issueDate: today.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        paymentTerms: 'net_30',
        currencyCode: 'INR',
        subtotal: subtotal.toFixed(4),
        taxAmount: totalTax.toFixed(4),
        total: total.toFixed(4),
        amountPaid: '0',
        balanceDue: total.toFixed(4),
        status: 'draft',
        threeWayMatchStatus: 'pending',
        notes: `Auto-generated from Purchase Order ${po.orderNumber}`,
        createdBy: userId,
      })
      .returning();

    // Insert bill lines
    if (billLineData.length > 0) {
      await this.db.insert(billLines).values(
        billLineData.map((line) => ({
          billId: bill.id,
          ...line,
        })),
      );
    }

    // Return the full bill with lines
    const lines = await this.db
      .select()
      .from(billLines)
      .where(eq(billLines.billId, bill.id));

    return { ...bill, lines };
  }

  /**
   * Auto-creates a Purchase Receipt (GRN) from an approved PO.
   * Copies PO lines → GRN lines with full ordered quantity as accepted.
   */
  async createGRN(tenantId: string, id: string, warehouseId: string) {
    const po = await this.findById(tenantId, id);

    if (po.status !== 'approved' && po.status !== 'partially_received') {
      throw new BadRequestException(
        `Only approved or partially received POs can have GRNs created. Current status: ${po.status}`,
      );
    }

    const grnNumber = await this.numberSeriesService.getNext(tenantId, 'purchase_receipt');

    const [receipt] = await this.db
      .insert(purchaseReceipts)
      .values({
        tenantId,
        receiptNumber: grnNumber,
        purchaseOrderId: id,
        supplierId: po.supplierId,
        receiptDate: new Date().toISOString().split('T')[0],
        status: 'draft',
        warehouseId,
        notes: `Auto-generated from PO ${po.orderNumber}`,
      })
      .returning();

    if (po.lines.length > 0) {
      await this.db.insert(purchaseReceiptLines).values(
        po.lines.map((line) => {
          const ordered = parseFloat(line.quantity);
          const alreadyReceived = parseFloat(line.receivedQty || '0');
          const remaining = Math.max(0, ordered - alreadyReceived);
          return {
            purchaseReceiptId: receipt.id,
            purchaseOrderLineId: line.id,
            itemId: line.itemId,
            acceptedQty: remaining.toFixed(4),
            rejectedQty: '0',
          };
        }),
      );
    }

    const lines = await this.db
      .select()
      .from(purchaseReceiptLines)
      .where(eq(purchaseReceiptLines.purchaseReceiptId, receipt.id));

    return { ...receipt, lines };
  }

  async amend(tenantId: string, id: string, userId: string, reason: string) {
    const po = await this.findById(tenantId, id);
    if (po.status !== 'approved' && po.status !== 'partially_received') {
      throw new BadRequestException('Only approved or partially received POs can be amended');
    }

    // Create new PO as draft with version+1
    const orderNumber = await this.numberSeriesService.getNext(tenantId, 'purchase_order');
    const [newPo] = await this.db.insert(purchaseOrders).values({
      tenantId,
      orderNumber,
      supplierId: po.supplierId,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: po.expectedDelivery,
      status: 'draft',
      subtotal: po.subtotal,
      taxAmount: po.taxAmount,
      discountAmount: po.discountAmount,
      totalAmount: po.totalAmount,
      notes: po.notes,
      version: (po.version || 1) + 1,
      amendedFromId: po.id,
      amendmentReason: reason,
      createdBy: userId,
    }).returning();

    // Copy lines
    if (po.lines?.length) {
      await this.db.insert(purchaseOrderLines).values(
        po.lines.map((l: Record<string, unknown>, idx: number) => ({
          purchaseOrderId: newPo.id,
          itemId: l.itemId as string,
          description: l.description as string || null,
          quantity: l.quantity as string,
          unitPrice: l.unitPrice as string,
          discount: l.discount as string || '0',
          taxRate: l.taxRate as string || '0',
          lineTotal: l.lineTotal as string || '0',
        })),
      );
    }

    // Record amendment
    await this.db.insert(poAmendments).values({
      tenantId,
      purchaseOrderId: newPo.id,
      version: (po.version || 1) + 1,
      fieldName: 'amendment',
      oldValue: `PO ${po.orderNumber} v${po.version || 1}`,
      newValue: `Amended: ${reason}`,
      changedBy: userId,
    });

    // Cancel original
    await this.db.update(purchaseOrders).set({
      status: 'cancelled',
      notes: `Amended to ${newPo.orderNumber}. Reason: ${reason}`,
      updatedAt: new Date(),
    }).where(eq(purchaseOrders.id, id));

    await this.auditService.logAction({
      tenantId,
      userId,
      action: 'update',
      entityType: 'purchase_order',
      entityId: newPo.id,
      changes: { amendedFrom: id, reason, newOrderNumber: newPo.orderNumber },
    });

    return this.findById(tenantId, newPo.id);
  }

  async recordAdvance(tenantId: string, id: string, amount: string) {
    const po = await this.findById(tenantId, id);
    if (po.status !== 'approved' && po.status !== 'partially_received') {
      throw new BadRequestException('Can only record advance on approved POs');
    }
    const currentPaid = parseFloat(po.advancePaid || '0');
    const newPaid = (currentPaid + parseFloat(amount)).toFixed(4);

    const [updated] = await this.db.update(purchaseOrders).set({
      advancePaid: newPaid,
      updatedAt: new Date(),
    }).where(eq(purchaseOrders.id, id)).returning();

    return updated;
  }

  async getAmendmentHistory(tenantId: string, id: string) {
    return this.db.select().from(poAmendments)
      .where(and(eq(poAmendments.purchaseOrderId, id), eq(poAmendments.tenantId, tenantId)))
      .orderBy(poAmendments.changedAt);
  }

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const [latest] = await this.db
      .select({ orderNumber: purchaseOrders.orderNumber })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          like(purchaseOrders.orderNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${purchaseOrders.orderNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.orderNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) sequence = lastNum + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
