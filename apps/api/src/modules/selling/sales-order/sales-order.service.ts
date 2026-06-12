import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, asc, desc, like, or, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  salesOrders,
  salesOrderLines,
  customers,
  invoices,
  invoiceLines,
  deliveryNotes,
  deliveryNoteLines,
  taxRates,
  items,
  businessSettings,
} from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto.js';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto.js';
import { EVENTS } from '../../../common/events.constants.js';

@Injectable()
export class SalesOrderService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
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
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(salesOrders.status, options.status as 'draft' | 'confirmed' | 'delivered' | 'invoiced' | 'cancelled'),
      );
    }

    if (options?.customerId) {
      conditions.push(eq(salesOrders.customerId, options.customerId));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(salesOrders.orderNumber, searchTerm));
    }

    const result = await this.db
      .select()
      .from(salesOrders)
      .where(and(...conditions))
      .orderBy(desc(salesOrders.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [order] = await this.db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, id),
          eq(salesOrders.tenantId, tenantId),
          isNull(salesOrders.deletedAt),
        ),
      )
      .limit(1);

    if (!order) {
      throw new NotFoundException(`Sales order with ID "${id}" not found`);
    }

    const lines = await this.db
      .select()
      .from(salesOrderLines)
      .where(eq(salesOrderLines.salesOrderId, id));

    return { ...order, lines };
  }

  async create(tenantId: string, data: CreateSalesOrderDto) {
    // Validate customer
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

    // Calculate totals from lines first (needed for credit check)
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const lineData = data.lines.map((line) => {
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      const discount = parseFloat(line.discount || '0');
      const taxRate = parseFloat(line.taxRate || '0');
      const lineSubtotal = qty * price;
      const lineDiscountAmt = lineSubtotal * (discount / 100);
      const lineTaxAmt = (lineSubtotal - lineDiscountAmt) * (taxRate / 100);
      const lineTotal = lineSubtotal - lineDiscountAmt + lineTaxAmt;

      subtotal += lineSubtotal;
      totalDiscount += lineDiscountAmt;
      totalTax += lineTaxAmt;

      return {
        ...line,
        lineTotal: lineTotal.toFixed(4),
      };
    });

    const totalAmount = subtotal - totalDiscount + totalTax;

    // Credit limit enforcement
    const creditLimit = parseFloat(customer.creditLimit ?? '0');
    const outstandingBalance = parseFloat(customer.outstandingBalance ?? '0');
    if (creditLimit > 0 && outstandingBalance + totalAmount > creditLimit) {
      throw new BadRequestException(
        `Order exceeds customer credit limit. ` +
        `Outstanding: ₹${outstandingBalance.toFixed(2)}, ` +
        `This order: ₹${totalAmount.toFixed(2)}, ` +
        `Credit limit: ₹${creditLimit.toFixed(2)}`,
      );
    }

    const orderNumber = await this.generateOrderNumber(tenantId);

    const [order] = await this.db
      .insert(salesOrders)
      .values({
        tenantId,
        orderNumber,
        customerId: data.customerId,
        quotationId: data.quotationId || null,
        orderDate: data.orderDate,
        deliveryDate: data.deliveryDate || null,
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

    // Insert line items
    if (lineData.length > 0) {
      await this.db.insert(salesOrderLines).values(
        lineData.map((line) => ({
          salesOrderId: order.id,
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

    return this.findById(tenantId, order.id);
  }

  async update(tenantId: string, id: string, data: UpdateSalesOrderDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft orders can be updated');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.deliveryDate !== undefined) updateData.deliveryDate = data.deliveryDate;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.termsAndConditions !== undefined) updateData.termsAndConditions = data.termsAndConditions;

    const [updated] = await this.db
      .update(salesOrders)
      .set(updateData)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'confirmed' | 'delivered' | 'invoiced' | 'cancelled',
  ) {
    const order = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['confirmed', 'cancelled'],
      confirmed: ['delivered', 'cancelled'],
      delivered: ['invoiced'],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${order.status}" to "${newStatus}"`,
      );
    }

    const [updated] = await this.db
      .update(salesOrders)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .returning();

    if (newStatus === 'confirmed') {
      this.eventEmitter.emit(EVENTS.SALES_ORDER_CONFIRMED, {
        orderId: order.id,
        tenantId,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        lines: order.lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
        })),
      });
    }

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);

    if (order.status !== 'draft') {
      throw new BadRequestException('Only draft orders can be deleted');
    }

    const [deleted] = await this.db
      .update(salesOrders)
      .set({ deletedAt: new Date() })
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  /**
   * Creates an invoice from a delivered sales order.
   * Copies SO lines → invoice lines with tax calculation, links via salesOrderId,
   * and transitions SO to 'invoiced' status.
   */
  async createInvoice(tenantId: string, id: string, userId: string) {
    const order = await this.findById(tenantId, id);

    if (order.status !== 'delivered') {
      throw new BadRequestException(
        'Only delivered sales orders can be invoiced. Current status: ' + order.status,
      );
    }

    // Check not already invoiced (check if an invoice with this SO already exists)
    const [existingInvoice] = await this.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.salesOrderId, id),
          eq(invoices.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (existingInvoice) {
      throw new BadRequestException('An invoice already exists for this sales order');
    }

    // Get customer for billing details
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, order.customerId), eq(customers.tenantId, tenantId)))
      .limit(1);

    // Get business settings for tax calculation (intra vs inter state)
    const [settings] = await this.db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.tenantId, tenantId))
      .limit(1);

    const companyState = settings?.state || '';
    const customerState = customer?.billingState || '';
    const isInterState = companyState !== '' && customerState !== '' && companyState !== customerState;

    // Generate invoice number
    const invoiceNumber = await this.numberSeriesService.getNext(tenantId, 'invoice');

    // Calculate due date (net_30 from today)
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);

    // Calculate line totals with tax
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const invoiceLineData = [];

    for (const soLine of order.lines) {
      const qty = parseFloat(soLine.quantity);
      const price = parseFloat(soLine.unitPrice);
      const discountPct = parseFloat(soLine.discount || '0');
      const lineSubtotal = qty * price;
      const lineDiscountAmt = lineSubtotal * (discountPct / 100);
      const taxableAmount = lineSubtotal - lineDiscountAmt;

      // Look up item for HSN code and default tax rate
      let hsnCode: string | null = null;
      let taxRate = parseFloat(soLine.taxRate || '0');
      let cgstRate = 0, sgstRate = 0, igstRate = 0;
      let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

      if (soLine.itemId) {
        const [item] = await this.db
          .select()
          .from(items)
          .where(eq(items.id, soLine.itemId))
          .limit(1);
        if (item) {
          hsnCode = item.hsnCode || null;
          // If SO line doesn't have a tax rate, try item's default
          if (taxRate === 0 && item.defaultTaxRateId) {
            const [tr] = await this.db
              .select()
              .from(taxRates)
              .where(eq(taxRates.id, item.defaultTaxRateId))
              .limit(1);
            if (tr) {
              taxRate = parseFloat(tr.rate);
            }
          }
        }
      }

      // Calculate GST breakdown
      const lineTaxAmt = taxableAmount * (taxRate / 100);
      if (isInterState) {
        igstRate = taxRate;
        igstAmount = lineTaxAmt;
      } else if (taxRate > 0) {
        cgstRate = taxRate / 2;
        sgstRate = taxRate / 2;
        cgstAmount = lineTaxAmt / 2;
        sgstAmount = lineTaxAmt / 2;
      }

      const lineTotal = taxableAmount + lineTaxAmt;

      subtotal += lineSubtotal;
      totalDiscount += lineDiscountAmt;
      totalTax += lineTaxAmt;

      invoiceLineData.push({
        productId: soLine.itemId,
        description: soLine.description,
        quantity: qty.toFixed(4),
        unitPrice: price.toFixed(4),
        unitOfMeasure: 'unit',
        discountType: discountPct > 0 ? 'percentage' : null,
        discountValue: discountPct > 0 ? discountPct.toFixed(4) : '0',
        taxAmount: lineTaxAmt.toFixed(4),
        lineTotal: lineTotal.toFixed(4),
        hsnCode,
        cgstRate: cgstRate.toFixed(4),
        sgstRate: sgstRate.toFixed(4),
        igstRate: igstRate.toFixed(4),
        cgstAmount: cgstAmount.toFixed(4),
        sgstAmount: sgstAmount.toFixed(4),
        igstAmount: igstAmount.toFixed(4),
      });
    }

    const totalAmount = subtotal - totalDiscount + totalTax;

    // Create the invoice
    const [invoice] = await this.db
      .insert(invoices)
      .values({
        tenantId,
        invoiceNumber,
        type: 'standard',
        customerId: order.customerId,
        salesOrderId: id,
        issueDate: today.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        paymentTerms: 'net_30',
        currencyCode: order.currency || 'INR',
        exchangeRate: '1',
        subtotal: subtotal.toFixed(4),
        discountAmount: totalDiscount.toFixed(4),
        taxAmount: totalTax.toFixed(4),
        total: totalAmount.toFixed(4),
        amountPaid: '0',
        balanceDue: totalAmount.toFixed(4),
        status: 'draft',
        notes: `Auto-generated from Sales Order ${order.orderNumber}`,
        createdBy: userId,
      })
      .returning();

    // Create invoice lines
    if (invoiceLineData.length > 0) {
      await this.db.insert(invoiceLines).values(
        invoiceLineData.map((line, idx) => ({
          tenantId,
          invoiceId: invoice.id,
          lineNumber: idx + 1,
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitOfMeasure: line.unitOfMeasure,
          discountType: line.discountType as 'percentage' | 'fixed' | null,
          discountValue: line.discountValue,
          discountAmount: '0',
          amount: line.lineTotal,
          taxAmount: line.taxAmount,
          hsnCode: line.hsnCode,
          cgstRate: line.cgstRate,
          sgstRate: line.sgstRate,
          igstRate: line.igstRate,
          cgstAmount: line.cgstAmount,
          sgstAmount: line.sgstAmount,
          igstAmount: line.igstAmount,
        })),
      );
    }

    // Mark SO as invoiced
    await this.db
      .update(salesOrders)
      .set({ status: 'invoiced', updatedAt: new Date() })
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)));

    return invoice;
  }

  /**
   * Auto-creates a delivery note from a confirmed sales order.
   * Copies all SO lines as delivery note lines.
   */
  async createDeliveryNote(tenantId: string, id: string, userId: string) {
    const order = await this.findById(tenantId, id);

    if (order.status !== 'confirmed') {
      throw new BadRequestException(
        'Only confirmed sales orders can have delivery notes created. Current status: ' + order.status,
      );
    }

    // Check if a DN already exists for this SO
    const existingDNs = await this.db
      .select({ id: deliveryNotes.id })
      .from(deliveryNotes)
      .where(
        and(
          eq(deliveryNotes.salesOrderId, id),
          eq(deliveryNotes.tenantId, tenantId),
          isNull(deliveryNotes.deletedAt),
        ),
      );

    if (existingDNs.length > 0) {
      throw new BadRequestException('A delivery note already exists for this sales order');
    }

    // Get customer for shipping address
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, order.customerId), eq(customers.tenantId, tenantId)))
      .limit(1);

    const deliveryNumber = await this.numberSeriesService.getNext(tenantId, 'delivery_note');
    const today = new Date().toISOString().split('T')[0];

    const [note] = await this.db
      .insert(deliveryNotes)
      .values({
        tenantId,
        deliveryNumber,
        salesOrderId: id,
        customerId: order.customerId,
        deliveryDate: order.deliveryDate || today,
        status: 'draft',
        shippingAddress: customer?.shippingAddress || customer?.billingAddress || null,
        notes: `Auto-generated from Sales Order ${order.orderNumber}`,
        createdBy: userId,
      })
      .returning();

    // Copy SO lines to DN lines
    if (order.lines.length > 0) {
      await this.db.insert(deliveryNoteLines).values(
        order.lines.map((soLine) => ({
          deliveryNoteId: note.id,
          salesOrderLineId: soLine.id,
          itemId: soLine.itemId,
          quantity: soLine.quantity,
        })),
      );
    }

    // Return the full delivery note with lines
    const lines = await this.db
      .select()
      .from(deliveryNoteLines)
      .where(eq(deliveryNoteLines.deliveryNoteId, note.id));

    return { ...note, lines };
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SO-${year}-`;

    const [latest] = await this.db
      .select({ orderNumber: salesOrders.orderNumber })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.tenantId, tenantId),
          like(salesOrders.orderNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${salesOrders.orderNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.orderNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
