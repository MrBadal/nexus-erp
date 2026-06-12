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
  deliveryNotes,
  deliveryNoteLines,
  salesOrders,
  salesOrderLines,
  itemWarehouses,
  items,
  invoices,
  invoiceLines,
  customers,
  businessSettings,
  taxRates,
} from '../../../database/schema/index.js';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto.js';
import { EVENTS } from '../../../common/events.constants.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';

@Injectable()
export class DeliveryNoteService {
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
      salesOrderId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(deliveryNotes.tenantId, tenantId),
      isNull(deliveryNotes.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(deliveryNotes.status, options.status as 'draft' | 'dispatched' | 'delivered' | 'returned'),
      );
    }

    if (options?.customerId) {
      conditions.push(eq(deliveryNotes.customerId, options.customerId));
    }

    if (options?.salesOrderId) {
      conditions.push(eq(deliveryNotes.salesOrderId, options.salesOrderId));
    }

    if (options?.search) {
      conditions.push(like(deliveryNotes.deliveryNumber, `%${options.search}%`));
    }

    return this.db
      .select()
      .from(deliveryNotes)
      .where(and(...conditions))
      .orderBy(desc(deliveryNotes.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [note] = await this.db
      .select()
      .from(deliveryNotes)
      .where(
        and(
          eq(deliveryNotes.id, id),
          eq(deliveryNotes.tenantId, tenantId),
          isNull(deliveryNotes.deletedAt),
        ),
      )
      .limit(1);

    if (!note) {
      throw new NotFoundException(`Delivery note with ID "${id}" not found`);
    }

    const lines = await this.db
      .select()
      .from(deliveryNoteLines)
      .where(eq(deliveryNoteLines.deliveryNoteId, id));

    return { ...note, lines };
  }

  async create(tenantId: string, data: CreateDeliveryNoteDto) {
    // Validate sales order
    const [order] = await this.db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, data.salesOrderId),
          eq(salesOrders.tenantId, tenantId),
          isNull(salesOrders.deletedAt),
        ),
      )
      .limit(1);

    if (!order) {
      throw new BadRequestException('Sales order not found');
    }

    if (order.status !== 'confirmed') {
      throw new BadRequestException('Sales order must be confirmed before creating a delivery note');
    }

    const deliveryNumber = await this.generateNumber(tenantId);

    const [note] = await this.db
      .insert(deliveryNotes)
      .values({
        tenantId,
        deliveryNumber,
        salesOrderId: data.salesOrderId,
        customerId: data.customerId,
        deliveryDate: data.deliveryDate,
        status: 'draft',
        carrier: data.carrier || null,
        trackingNumber: data.trackingNumber || null,
        shippingAddress: data.shippingAddress || null,
        notes: data.notes || null,
      })
      .returning();

    if (data.lines.length > 0) {
      await this.db.insert(deliveryNoteLines).values(
        data.lines.map((line) => ({
          deliveryNoteId: note.id,
          salesOrderLineId: line.salesOrderLineId || null,
          itemId: line.itemId,
          quantity: line.quantity,
        })),
      );
    }

    return this.findById(tenantId, note.id);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'dispatched' | 'delivered' | 'returned',
  ) {
    const note = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['dispatched'],
      dispatched: ['delivered', 'returned'],
    };

    const allowed = validTransitions[note.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${note.status}" to "${newStatus}"`,
      );
    }

    // Negative stock prevention: check stock availability before dispatching
    if (newStatus === 'dispatched') {
      const insufficientItems: string[] = [];

      for (const line of note.lines) {
        if (!line.itemId) continue;

        // Check if item is a stock type (skip services/consumables)
        const [item] = await this.db
          .select({ itemType: items.itemType, name: items.name })
          .from(items)
          .where(eq(items.id, line.itemId))
          .limit(1);

        if (!item || item.itemType !== 'stock') continue;

        // Get total available stock across all warehouses for this tenant
        const [stockResult] = await this.db
          .select({
            totalAvailable: sql<string>`COALESCE(SUM(CAST(${itemWarehouses.quantity} AS numeric) - CAST(${itemWarehouses.reservedQuantity} AS numeric)), 0)`,
          })
          .from(itemWarehouses)
          .where(
            and(
              eq(itemWarehouses.itemId, line.itemId),
              eq(itemWarehouses.tenantId, tenantId),
            ),
          );

        const available = parseFloat(stockResult?.totalAvailable || '0');
        const required = parseFloat(line.quantity);

        if (available < required) {
          insufficientItems.push(
            `${item.name}: need ${required}, available ${available}`,
          );
        }
      }

      if (insufficientItems.length > 0) {
        throw new BadRequestException(
          `Insufficient stock for dispatch:\n${insufficientItems.join('\n')}`,
        );
      }
    }

    const [updated] = await this.db
      .update(deliveryNotes)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(deliveryNotes.id, id), eq(deliveryNotes.tenantId, tenantId)))
      .returning();

    if (newStatus === 'delivered') {
      this.eventEmitter.emit(EVENTS.DELIVERY_NOTE_COMPLETED, {
        noteId: note.id,
        tenantId,
        deliveryNumber: note.deliveryNumber,
        customerId: note.customerId,
        deliveryDate: note.deliveryDate,
        lines: note.lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
        })),
      });
    }

    return updated;
  }

  /**
   * Create an invoice from a delivered delivery note.
   * Copies DN lines → invoice lines with full GST tax calculation.
   */
  async createInvoice(tenantId: string, id: string, userId: string) {
    const note = await this.findById(tenantId, id);

    if (note.status !== 'delivered') {
      throw new BadRequestException(
        `Only delivered delivery notes can be invoiced. Current status: ${note.status}`,
      );
    }

    // Check not already invoiced
    const [existingInvoice] = await this.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.salesOrderId, note.salesOrderId!),
          eq(invoices.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (existingInvoice) {
      throw new BadRequestException('An invoice already exists for this delivery note\'s sales order');
    }

    // Get SO lines for pricing data (DN lines don't have prices)
    const soLines = note.salesOrderId
      ? await this.db
          .select()
          .from(salesOrderLines)
          .where(eq(salesOrderLines.salesOrderId, note.salesOrderId))
      : [];

    // Build price lookup from SO lines
    const soLineMap = new Map(soLines.map((l) => [l.itemId, l]));

    // Get customer for billing details
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, note.customerId), eq(customers.tenantId, tenantId)))
      .limit(1);

    // Get business settings for intra/inter state tax determination
    const [settings] = await this.db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.tenantId, tenantId))
      .limit(1);

    const companyState = settings?.state || '';
    const customerState = customer?.billingState || '';
    const isInterState = companyState !== '' && customerState !== '' && companyState !== customerState;

    const invoiceNumber = await this.numberSeriesService.getNext(tenantId, 'invoice');
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const invoiceLineData: {
      productId: string | null; description: string | null; quantity: string;
      unitPrice: string; discountType: 'percentage' | 'fixed' | null; discountValue: string;
      taxAmount: string; lineTotal: string; hsnCode: string | null;
      cgstRate: string; sgstRate: string; igstRate: string;
      cgstAmount: string; sgstAmount: string; igstAmount: string;
    }[] = [];

    for (const dnLine of note.lines) {
      const soLine = soLineMap.get(dnLine.itemId);
      const qty = parseFloat(dnLine.quantity);
      const price = parseFloat(soLine?.unitPrice || '0');
      const discountPct = parseFloat(soLine?.discount || '0');
      const lineSubtotal = qty * price;
      const lineDiscountAmt = lineSubtotal * (discountPct / 100);
      const taxableAmount = lineSubtotal - lineDiscountAmt;

      let hsnCode: string | null = null;
      let taxRate = parseFloat(soLine?.taxRate || '0');
      let cgstRate = 0, sgstRate = 0, igstRate = 0;
      let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

      if (dnLine.itemId) {
        const [item] = await this.db
          .select()
          .from(items)
          .where(eq(items.id, dnLine.itemId))
          .limit(1);
        if (item) {
          hsnCode = item.hsnCode || null;
          if (taxRate === 0 && item.defaultTaxRateId) {
            const [tr] = await this.db
              .select()
              .from(taxRates)
              .where(eq(taxRates.id, item.defaultTaxRateId))
              .limit(1);
            if (tr) taxRate = parseFloat(tr.rate);
          }
        }
      }

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

      subtotal += lineSubtotal;
      totalDiscount += lineDiscountAmt;
      totalTax += lineTaxAmt;

      invoiceLineData.push({
        productId: dnLine.itemId,
        description: soLine?.description || null,
        quantity: qty.toFixed(4),
        unitPrice: price.toFixed(4),
        discountType: discountPct > 0 ? 'percentage' : null,
        discountValue: discountPct > 0 ? discountPct.toFixed(4) : '0',
        taxAmount: lineTaxAmt.toFixed(4),
        lineTotal: (taxableAmount + lineTaxAmt).toFixed(4),
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

    const [invoice] = await this.db
      .insert(invoices)
      .values({
        tenantId,
        invoiceNumber,
        type: 'standard',
        customerId: note.customerId,
        salesOrderId: note.salesOrderId,
        issueDate: today.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        paymentTerms: 'net_30',
        currencyCode: 'INR',
        exchangeRate: '1',
        subtotal: subtotal.toFixed(4),
        discountAmount: totalDiscount.toFixed(4),
        taxAmount: totalTax.toFixed(4),
        total: totalAmount.toFixed(4),
        amountPaid: '0',
        balanceDue: totalAmount.toFixed(4),
        status: 'draft',
        notes: `Auto-generated from Delivery Note ${note.deliveryNumber}`,
        createdBy: userId,
      })
      .returning();

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
          unitOfMeasure: 'unit',
          discountType: line.discountType,
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

    // Mark SO as invoiced if linked
    if (note.salesOrderId) {
      await this.db
        .update(salesOrders)
        .set({ status: 'invoiced', updatedAt: new Date() })
        .where(and(eq(salesOrders.id, note.salesOrderId), eq(salesOrders.tenantId, tenantId)));
    }

    return invoice;
  }

  async softDelete(tenantId: string, id: string) {
    const note = await this.findById(tenantId, id);

    if (note.status !== 'draft') {
      throw new BadRequestException('Only draft delivery notes can be deleted');
    }

    const [deleted] = await this.db
      .update(deliveryNotes)
      .set({ deletedAt: new Date() })
      .where(and(eq(deliveryNotes.id, id), eq(deliveryNotes.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DN-${year}-`;

    const [latest] = await this.db
      .select({ deliveryNumber: deliveryNotes.deliveryNumber })
      .from(deliveryNotes)
      .where(
        and(
          eq(deliveryNotes.tenantId, tenantId),
          like(deliveryNotes.deliveryNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${deliveryNotes.deliveryNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.deliveryNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) sequence = lastNum + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
