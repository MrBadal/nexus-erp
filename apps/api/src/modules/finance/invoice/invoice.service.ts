import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  invoices,
  invoiceLines,
  journalEntries,
  journalLines,
  accounts,
  type NewInvoice,
} from '../../../database/schema/index.js';

interface CreateInvoiceDto {
  type?: string;
  customerId?: string;
  billingAddress?: any;
  shippingAddress?: any;
  issueDate: string;
  dueDate: string;
  paymentTerms?: string;
  currencyCode?: string;
  exchangeRate?: string;
  discountType?: string;
  discountValue?: string;
  notes?: string;
  customerNotes?: string;
  termsAndConditions?: string;
  footer?: string;
  creditNoteForId?: string;
  lines: {
    productId?: string;
    description?: string;
    quantity: string;
    unitPrice: string;
    unitOfMeasure?: string;
    discountType?: string;
    discountValue?: string;
    taxRateId?: string;
    accountId?: string;
  }[];
}

@Injectable()
export class InvoiceService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    tenantId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ) {
    const conditions = [
      eq(invoices.tenantId, tenantId),
      isNull(invoices.deletedAt),
    ];

    if (options?.status) {
      conditions.push(eq(invoices.status, options.status as any));
    }

    return this.db
      .select()
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.issueDate), desc(invoices.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.tenantId, tenantId),
          isNull(invoices.deletedAt),
        ),
      )
      .limit(1);

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }

    const lines = await this.db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, id))
      .orderBy(invoiceLines.sortOrder);

    return { ...invoice, lines };
  }

  async create(tenantId: string, userId: string, data: CreateInvoiceDto) {
    if (!data.lines || data.lines.length === 0) {
      throw new BadRequestException('Invoice must have at least one line');
    }

    const invoiceNumber = await this.generateInvoiceNumber(tenantId, data.type);

    // Calculate line amounts
    const calculatedLines = data.lines.map((line, index) => {
      const quantity = parseFloat(line.quantity || '1');
      const unitPrice = parseFloat(line.unitPrice || '0');
      let lineAmount = quantity * unitPrice;

      let discountAmount = 0;
      if (line.discountType && line.discountValue) {
        const discountVal = parseFloat(line.discountValue);
        if (line.discountType === 'percentage') {
          discountAmount = lineAmount * (discountVal / 100);
        } else {
          discountAmount = discountVal;
        }
      }

      lineAmount -= discountAmount;

      // TODO: calculate tax based on taxRateId lookup
      const taxAmount = 0;

      return {
        ...line,
        lineNumber: index + 1,
        sortOrder: index,
        discountAmount: discountAmount.toFixed(4),
        amount: lineAmount.toFixed(4),
        taxAmount: taxAmount.toFixed(4),
      };
    });

    const subtotal = calculatedLines.reduce(
      (sum, line) => sum + parseFloat(line.amount),
      0,
    );

    let invoiceDiscountAmount = 0;
    if (data.discountType && data.discountValue) {
      const discountVal = parseFloat(data.discountValue);
      if (data.discountType === 'percentage') {
        invoiceDiscountAmount = subtotal * (discountVal / 100);
      } else {
        invoiceDiscountAmount = discountVal;
      }
    }

    const taxAmount = calculatedLines.reduce(
      (sum, line) => sum + parseFloat(line.taxAmount),
      0,
    );

    const total = subtotal - invoiceDiscountAmount + taxAmount;

    const [invoice] = await this.db
      .insert(invoices)
      .values({
        tenantId,
        invoiceNumber,
        type: (data.type as any) || 'standard',
        status: 'draft',
        customerId: data.customerId || null,
        billingAddress: data.billingAddress || null,
        shippingAddress: data.shippingAddress || null,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        paymentTerms: (data.paymentTerms as any) || 'net_30',
        currencyCode: data.currencyCode || 'USD',
        exchangeRate: data.exchangeRate || '1',
        subtotal: subtotal.toFixed(4),
        discountType: data.discountType ? (data.discountType as any) : null,
        discountValue: data.discountValue || null,
        discountAmount: invoiceDiscountAmount.toFixed(4),
        taxAmount: taxAmount.toFixed(4),
        total: total.toFixed(4),
        amountPaid: '0',
        balanceDue: total.toFixed(4),
        notes: data.notes || null,
        customerNotes: data.customerNotes || null,
        termsAndConditions: data.termsAndConditions || null,
        footer: data.footer || null,
        creditNoteForId: data.creditNoteForId || null,
        createdBy: userId,
      })
      .returning();

    // Insert lines
    const lineValues = calculatedLines.map((line) => ({
      tenantId,
      invoiceId: invoice.id,
      lineNumber: line.lineNumber,
      productId: line.productId || null,
      description: line.description || null,
      quantity: line.quantity || '1',
      unitPrice: line.unitPrice || '0',
      unitOfMeasure: line.unitOfMeasure || null,
      discountType: line.discountType ? (line.discountType as any) : null,
      discountValue: line.discountValue || null,
      discountAmount: line.discountAmount,
      amount: line.amount,
      taxRateId: line.taxRateId || null,
      taxAmount: line.taxAmount,
      accountId: line.accountId || null,
      sortOrder: line.sortOrder,
    }));

    await this.db.insert(invoiceLines).values(lineValues);

    return this.findById(tenantId, invoice.id);
  }

  async update(tenantId: string, id: string, data: Partial<CreateInvoiceDto>) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be modified');
    }

    const updateData: any = { updatedAt: new Date() };

    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
    if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;
    if (data.issueDate) updateData.issueDate = data.issueDate;
    if (data.dueDate) updateData.dueDate = data.dueDate;
    if (data.paymentTerms) updateData.paymentTerms = data.paymentTerms;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.customerNotes !== undefined) updateData.customerNotes = data.customerNotes;
    if (data.termsAndConditions !== undefined) updateData.termsAndConditions = data.termsAndConditions;
    if (data.footer !== undefined) updateData.footer = data.footer;

    if (data.lines) {
      // Recalculate with new lines
      await this.db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id));

      const calculatedLines = data.lines.map((line, index) => {
        const quantity = parseFloat(line.quantity || '1');
        const unitPrice = parseFloat(line.unitPrice || '0');
        let lineAmount = quantity * unitPrice;

        let discountAmount = 0;
        if (line.discountType && line.discountValue) {
          const discountVal = parseFloat(line.discountValue);
          if (line.discountType === 'percentage') {
            discountAmount = lineAmount * (discountVal / 100);
          } else {
            discountAmount = discountVal;
          }
        }
        lineAmount -= discountAmount;

        return {
          tenantId,
          invoiceId: id,
          lineNumber: index + 1,
          productId: line.productId || null,
          description: line.description || null,
          quantity: line.quantity || '1',
          unitPrice: line.unitPrice || '0',
          unitOfMeasure: line.unitOfMeasure || null,
          discountType: line.discountType ? (line.discountType as any) : null,
          discountValue: line.discountValue || null,
          discountAmount: discountAmount.toFixed(4),
          amount: lineAmount.toFixed(4),
          taxRateId: line.taxRateId || null,
          taxAmount: '0',
          accountId: line.accountId || null,
          sortOrder: index,
        };
      });

      await this.db.insert(invoiceLines).values(calculatedLines);

      const subtotal = calculatedLines.reduce(
        (sum, l) => sum + parseFloat(l.amount),
        0,
      );

      let invoiceDiscount = 0;
      const dType = data.discountType || existing.discountType;
      const dValue = data.discountValue || existing.discountValue;
      if (dType && dValue) {
        const dv = parseFloat(dValue);
        invoiceDiscount = dType === 'percentage' ? subtotal * (dv / 100) : dv;
      }

      const total = subtotal - invoiceDiscount;
      const paid = parseFloat(existing.amountPaid);

      updateData.subtotal = subtotal.toFixed(4);
      updateData.discountAmount = invoiceDiscount.toFixed(4);
      updateData.total = total.toFixed(4);
      updateData.balanceDue = (total - paid).toFixed(4);
    }

    await this.db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id));

    return this.findById(tenantId, id);
  }

  async confirm(tenantId: string, id: string) {
    const invoice = await this.findById(tenantId, id);

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be confirmed');
    }

    if (invoice.lines.length === 0) {
      throw new BadRequestException('Invoice must have at least one line');
    }

    const [updated] = await this.db
      .update(invoices)
      .set({ status: 'sent', updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();

    this.eventEmitter.emit('invoice.confirmed', {
      invoiceId: id,
      tenantId,
      invoiceNumber: invoice.invoiceNumber,
    });

    return this.findById(tenantId, id);
  }

  async send(tenantId: string, id: string) {
    const invoice = await this.findById(tenantId, id);

    if (invoice.status === 'draft') {
      throw new BadRequestException('Confirm the invoice before sending');
    }

    if (['cancelled', 'void'].includes(invoice.status)) {
      throw new BadRequestException('Cannot send a cancelled or voided invoice');
    }

    this.eventEmitter.emit('invoice.send', {
      invoiceId: id,
      tenantId,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
    });

    return { message: 'Invoice queued for sending' };
  }

  async recordPayment(
    tenantId: string,
    id: string,
    data: { amount: string; date: string; reference?: string; paymentMethod?: string },
  ) {
    const invoice = await this.findById(tenantId, id);

    if (['draft', 'cancelled', 'void'].includes(invoice.status)) {
      throw new BadRequestException(`Cannot record payment for ${invoice.status} invoice`);
    }

    const paymentAmount = parseFloat(data.amount);
    const currentPaid = parseFloat(invoice.amountPaid);
    const total = parseFloat(invoice.total);

    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    const newPaid = currentPaid + paymentAmount;

    if (newPaid > total + 0.01) {
      throw new BadRequestException(
        `Payment of ${paymentAmount} exceeds balance due of ${(total - currentPaid).toFixed(4)}`,
      );
    }

    const newBalanceDue = total - newPaid;
    const newStatus = Math.abs(newBalanceDue) < 0.01 ? 'paid' : 'partially_paid';

    const [updated] = await this.db
      .update(invoices)
      .set({
        amountPaid: newPaid.toFixed(4),
        balanceDue: newBalanceDue.toFixed(4),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();

    this.eventEmitter.emit('invoice.payment_recorded', {
      invoiceId: id,
      tenantId,
      amount: paymentAmount,
      newStatus,
    });

    return this.findById(tenantId, id);
  }

  async voidInvoice(tenantId: string, id: string) {
    const invoice = await this.findById(tenantId, id);

    if (invoice.status === 'void') {
      throw new BadRequestException('Invoice is already voided');
    }

    if (parseFloat(invoice.amountPaid) > 0) {
      throw new BadRequestException(
        'Cannot void invoice with payments. Issue a credit note instead.',
      );
    }

    const [updated] = await this.db
      .update(invoices)
      .set({ status: 'void', updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();

    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    const invoice = await this.findById(tenantId, id);

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be deleted');
    }

    await this.db
      .update(invoices)
      .set({ deletedAt: new Date() })
      .where(eq(invoices.id, id));

    return { message: 'Invoice deleted successfully' };
  }

  private async generateInvoiceNumber(
    tenantId: string,
    type?: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type === 'credit_note' ? `CN-${year}-` : `INV-${year}-`;

    const [latest] = await this.db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          sql`${invoices.invoiceNumber} LIKE ${prefix + '%'}`,
        ),
      )
      .orderBy(desc(invoices.invoiceNumber))
      .limit(1);

    let nextNum = 1;
    if (latest) {
      const currentNum = parseInt(latest.invoiceNumber.replace(prefix, ''), 10);
      if (!isNaN(currentNum)) {
        nextNum = currentNum + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(6, '0')}`;
  }
}
