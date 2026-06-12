import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  quotations,
  quotationLines,
  customers,
  salesOrders,
  salesOrderLines,
} from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';
import { CreateQuotationDto } from './dto/create-quotation.dto.js';
import { UpdateQuotationDto } from './dto/update-quotation.dto.js';

@Injectable()
export class QuotationService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      customerId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(quotations.tenantId, tenantId),
      isNull(quotations.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(quotations.status, options.status as 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'),
      );
    }

    if (options?.customerId) {
      conditions.push(eq(quotations.customerId, options.customerId));
    }

    if (options?.search) {
      conditions.push(like(quotations.quotationNumber, `%${options.search}%`));
    }

    return this.db
      .select()
      .from(quotations)
      .where(and(...conditions))
      .orderBy(desc(quotations.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [quotation] = await this.db
      .select()
      .from(quotations)
      .where(
        and(
          eq(quotations.id, id),
          eq(quotations.tenantId, tenantId),
          isNull(quotations.deletedAt),
        ),
      )
      .limit(1);

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID "${id}" not found`);
    }

    const lines = await this.db
      .select()
      .from(quotationLines)
      .where(eq(quotationLines.quotationId, id));

    return { ...quotation, lines };
  }

  async create(tenantId: string, data: CreateQuotationDto) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, data.customerId),
          eq(customers.tenantId, tenantId),
          isNull(customers.deletedAt),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const quotationNumber = await this.generateNumber(tenantId);

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

    const [quotation] = await this.db
      .insert(quotations)
      .values({
        tenantId,
        quotationNumber,
        customerId: data.customerId,
        quotationDate: data.quotationDate,
        validUntil: data.validUntil,
        status: 'draft',
        subtotal: subtotal.toFixed(4),
        taxAmount: totalTax.toFixed(4),
        discountAmount: totalDiscount.toFixed(4),
        totalAmount: totalAmount.toFixed(4),
        currency: data.currency || 'INR',
        notes: data.notes || null,
        termsAndConditions: data.termsAndConditions || null,
      })
      .returning();

    if (lineData.length > 0) {
      await this.db.insert(quotationLines).values(
        lineData.map((line) => ({
          quotationId: quotation.id,
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

    return this.findById(tenantId, quotation.id);
  }

  async update(tenantId: string, id: string, data: UpdateQuotationDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft quotations can be updated');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.termsAndConditions !== undefined) updateData.termsAndConditions = data.termsAndConditions;

    const [updated] = await this.db
      .update(quotations)
      .set(updateData)
      .where(and(eq(quotations.id, id), eq(quotations.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'sent' | 'accepted' | 'rejected' | 'expired',
  ) {
    const quotation = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['sent'],
      sent: ['accepted', 'rejected', 'expired'],
    };

    const allowed = validTransitions[quotation.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${quotation.status}" to "${newStatus}"`,
      );
    }

    const [updated] = await this.db
      .update(quotations)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(quotations.id, id), eq(quotations.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const quotation = await this.findById(tenantId, id);

    if (quotation.status !== 'draft') {
      throw new BadRequestException('Only draft quotations can be deleted');
    }

    const [deleted] = await this.db
      .update(quotations)
      .set({ deletedAt: new Date() })
      .where(and(eq(quotations.id, id), eq(quotations.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  /**
   * Converts an accepted quotation to a sales order.
   * Copies quotation lines → SO lines, marks quotation as 'accepted' if not already,
   * links SO via quotationId.
   */
  async convertToSalesOrder(tenantId: string, id: string, userId: string) {
    const quotation = await this.findById(tenantId, id);

    if (quotation.status !== 'accepted' && quotation.status !== 'sent') {
      throw new BadRequestException(
        `Only sent or accepted quotations can be converted to sales orders. Current status: ${quotation.status}`,
      );
    }

    // Check if already converted
    const [existingSO] = await this.db
      .select({ id: salesOrders.id })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.quotationId, id),
          eq(salesOrders.tenantId, tenantId),
          isNull(salesOrders.deletedAt),
        ),
      )
      .limit(1);

    if (existingSO) {
      throw new BadRequestException('A sales order already exists for this quotation');
    }

    const orderNumber = await this.numberSeriesService.getNext(tenantId, 'sales_order');
    const today = new Date().toISOString().split('T')[0];

    // Create the sales order from quotation data
    const [order] = await this.db
      .insert(salesOrders)
      .values({
        tenantId,
        orderNumber,
        customerId: quotation.customerId,
        quotationId: id,
        orderDate: today,
        status: 'draft',
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        discountAmount: quotation.discountAmount,
        totalAmount: quotation.totalAmount,
        currency: quotation.currency,
        notes: quotation.notes ? `From Quotation ${quotation.quotationNumber}. ${quotation.notes}` : `From Quotation ${quotation.quotationNumber}`,
        termsAndConditions: quotation.termsAndConditions,
        createdBy: userId,
      })
      .returning();

    // Copy quotation lines → SO lines
    if (quotation.lines.length > 0) {
      await this.db.insert(salesOrderLines).values(
        quotation.lines.map((ql) => ({
          salesOrderId: order.id,
          itemId: ql.itemId,
          description: ql.description,
          quantity: ql.quantity,
          unitPrice: ql.unitPrice,
          discount: ql.discount || '0',
          taxRate: ql.taxRate || '0',
          lineTotal: ql.lineTotal,
        })),
      );
    }

    // Mark quotation as accepted if it was just 'sent'
    if (quotation.status === 'sent') {
      await this.db
        .update(quotations)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(and(eq(quotations.id, id), eq(quotations.tenantId, tenantId)));
    }

    // Return the full SO with lines
    const lines = await this.db
      .select()
      .from(salesOrderLines)
      .where(eq(salesOrderLines.salesOrderId, order.id));

    return { ...order, lines };
  }

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QTN-${year}-`;

    const [latest] = await this.db
      .select({ quotationNumber: quotations.quotationNumber })
      .from(quotations)
      .where(
        and(
          eq(quotations.tenantId, tenantId),
          like(quotations.quotationNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${quotations.quotationNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.quotationNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) sequence = lastNum + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
