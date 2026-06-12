import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, desc, like } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  constructionWorkOrders as workOrders,
  workOrderLines,
  workOrderPayments,
  constructionContracts,
  type NewConstructionWorkOrder as NewWorkOrder,
  type NewWorkOrderPayment,
} from '../../../database/schema/index.js';
import { EVENTS } from '../../../common/events.constants.js';

interface CreateWorkOrderDto {
  contractId: string;
  type?: string;
  vendorName: string;
  vendorGstin?: string;
  vendorPan?: string;
  vendorType?: string;
  scopeOfWork: string;
  workLocation?: string;
  orderValue: string;
  gstRate?: string;
  retentionPercentage?: string;
  tdsApplicable?: boolean;
  tdsRate?: string;
  tdsSection?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  lines?: { boqItemId?: string; description: string; unit?: string; quantity?: string; rate?: string; amount: string }[];
}

interface CreateWorkOrderPaymentDto {
  paymentDate: string;
  grossAmount: string;
  notes?: string;
}

@Injectable()
export class WorkOrderService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    tenantId: string,
    options?: { contractId?: string; status?: string; type?: string; limit?: number; offset?: number },
  ) {
    const conditions = [eq(workOrders.tenantId, tenantId), isNull(workOrders.deletedAt)];
    if (options?.contractId) conditions.push(eq(workOrders.contractId, options.contractId));
    if (options?.status) conditions.push(eq(workOrders.status, options.status as any));
    if (options?.type) conditions.push(eq(workOrders.type, options.type as any));

    return this.db
      .select()
      .from(workOrders)
      .where(and(...conditions))
      .orderBy(desc(workOrders.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [wo] = await this.db
      .select()
      .from(workOrders)
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId), isNull(workOrders.deletedAt)))
      .limit(1);

    if (!wo) throw new NotFoundException(`Work Order with ID "${id}" not found`);

    const lines = await this.db.select().from(workOrderLines).where(eq(workOrderLines.workOrderId, id));
    const payments = await this.db.select().from(workOrderPayments).where(eq(workOrderPayments.workOrderId, id));

    return { ...wo, lines, payments };
  }

  async create(tenantId: string, userId: string, data: CreateWorkOrderDto) {
    const [contract] = await this.db
      .select()
      .from(constructionContracts)
      .where(and(eq(constructionContracts.id, data.contractId), eq(constructionContracts.tenantId, tenantId), isNull(constructionContracts.deletedAt)))
      .limit(1);

    if (!contract) throw new BadRequestException('Contract not found');

    const woNumber = await this.generateWoNumber(tenantId);

    // Auto-calculate TDS rate based on vendor type
    const vendorType = data.vendorType || 'company_firm';
    const tdsRate = data.tdsRate || (vendorType === 'individual_huf' ? '1' : '2');

    const [wo] = await this.db
      .insert(workOrders)
      .values({
        tenantId,
        contractId: data.contractId,
        workOrderNumber: woNumber,
        type: (data.type as any) || 'subcontractor',
        status: 'draft',
        vendorName: data.vendorName,
        vendorGstin: data.vendorGstin || null,
        vendorPan: data.vendorPan || null,
        vendorType: vendorType as any,
        scopeOfWork: data.scopeOfWork,
        workLocation: data.workLocation || null,
        orderValue: data.orderValue,
        gstRate: data.gstRate || '12',
        retentionPercentage: data.retentionPercentage || '5',
        tdsApplicable: data.tdsApplicable ?? true,
        tdsRate,
        tdsSection: data.tdsSection || '194C',
        totalPaid: '0',
        tdsDeducted: '0',
        retentionHeld: '0',
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        notes: data.notes || null,
        createdBy: userId,
      })
      .returning();

    if (data.lines && data.lines.length > 0) {
      await this.db.insert(workOrderLines).values(
        data.lines.map((l, i) => ({
          workOrderId: wo.id,
          boqItemId: l.boqItemId || null,
          description: l.description,
          unit: l.unit || null,
          quantity: l.quantity || null,
          rate: l.rate || null,
          amount: l.amount,
          lineNumber: i + 1,
        })),
      );
    }

    return this.findById(tenantId, wo.id);
  }

  async approve(tenantId: string, id: string, userId: string) {
    const wo = await this.findById(tenantId, id);

    if (wo.status !== 'draft') {
      throw new BadRequestException('Only draft work orders can be approved');
    }

    const [updated] = await this.db
      .update(workOrders)
      .set({ status: 'approved', approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(workOrders.id, id))
      .returning();

    return updated;
  }

  // ── Process Payment → TDS deduction + AP Journal ──────────────────────────

  async processPayment(tenantId: string, workOrderId: string, userId: string, data: CreateWorkOrderPaymentDto) {
    const wo = await this.findById(tenantId, workOrderId);

    if (!['approved', 'active'].includes(wo.status)) {
      throw new BadRequestException('Work order must be approved or active to process payment');
    }

    const grossAmount = parseFloat(data.grossAmount);
    const gstRate = parseFloat(wo.gstRate);
    const gstAmount = grossAmount * (gstRate / 100);
    const retentionPct = parseFloat(wo.retentionPercentage);
    const retentionAmount = grossAmount * (retentionPct / 100);

    // TDS calculation (Section 194C)
    let tdsAmount = 0;
    if (wo.tdsApplicable) {
      const tdsRate = parseFloat(wo.tdsRate);
      tdsAmount = grossAmount * (tdsRate / 100);
    }

    const netPayable = grossAmount + gstAmount - retentionAmount - tdsAmount;

    const paymentNumber = await this.generatePaymentNumber(tenantId);

    const [payment] = await this.db
      .insert(workOrderPayments)
      .values({
        tenantId,
        workOrderId,
        paymentNumber,
        paymentDate: data.paymentDate,
        grossAmount: grossAmount.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        tdsAmount: tdsAmount.toFixed(2),
        retentionAmount: retentionAmount.toFixed(2),
        netPayable: netPayable.toFixed(2),
        status: 'draft',
        notes: data.notes || null,
        createdBy: userId,
      })
      .returning();

    // Update work order totals
    await this.db
      .update(workOrders)
      .set({
        totalPaid: (parseFloat(wo.totalPaid) + grossAmount).toFixed(2),
        tdsDeducted: (parseFloat(wo.tdsDeducted) + tdsAmount).toFixed(2),
        retentionHeld: (parseFloat(wo.retentionHeld) + retentionAmount).toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, workOrderId));

    return payment;
  }

  async approvePayment(tenantId: string, paymentId: string, userId: string) {
    const [payment] = await this.db
      .select()
      .from(workOrderPayments)
      .where(and(eq(workOrderPayments.id, paymentId), eq(workOrderPayments.tenantId, tenantId)))
      .limit(1);

    if (!payment) throw new NotFoundException(`Payment with ID "${paymentId}" not found`);
    if (payment.status !== 'draft') throw new BadRequestException('Payment is already approved');

    const [wo] = await this.db
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, payment.workOrderId))
      .limit(1);

    const [updated] = await this.db
      .update(workOrderPayments)
      .set({ status: 'approved', approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(workOrderPayments.id, paymentId))
      .returning();

    // Emit event → IntegrationService will post AP + TDS journal
    this.eventEmitter.emit(EVENTS.WORK_ORDER_PAYMENT_APPROVED, {
      paymentId,
      tenantId,
      paymentNumber: payment.paymentNumber,
      workOrderId: payment.workOrderId,
      vendorName: wo?.vendorName,
      vendorPan: wo?.vendorPan,
      tdsSection: wo?.tdsSection,
      grossAmount: payment.grossAmount,
      gstAmount: payment.gstAmount,
      tdsAmount: payment.tdsAmount,
      retentionAmount: payment.retentionAmount,
      netPayable: payment.netPayable,
      paymentDate: payment.paymentDate,
      userId,
    });

    return updated;
  }

  private async generateWoNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WO-${year}-`;
    const all = await this.db
      .select({ workOrderNumber: workOrders.workOrderNumber })
      .from(workOrders)
      .where(and(eq(workOrders.tenantId, tenantId), like(workOrders.workOrderNumber, `${prefix}%`)));
    return `${prefix}${(all.length + 1).toString().padStart(4, '0')}`;
  }

  private async generatePaymentNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WOP-${year}-`;
    const all = await this.db
      .select({ paymentNumber: workOrderPayments.paymentNumber })
      .from(workOrderPayments)
      .where(and(eq(workOrderPayments.tenantId, tenantId), like(workOrderPayments.paymentNumber, `${prefix}%`)));
    return `${prefix}${(all.length + 1).toString().padStart(4, '0')}`;
  }
}
