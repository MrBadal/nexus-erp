import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, lte, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { recurringInvoiceTemplates, invoices, invoiceLines } from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';

@Injectable()
export class RecurringInvoiceService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
  ) {}

  async findAll(tenantId: string) {
    return this.db
      .select()
      .from(recurringInvoiceTemplates)
      .where(eq(recurringInvoiceTemplates.tenantId, tenantId));
  }

  async findById(tenantId: string, id: string) {
    const [template] = await this.db
      .select()
      .from(recurringInvoiceTemplates)
      .where(and(eq(recurringInvoiceTemplates.id, id), eq(recurringInvoiceTemplates.tenantId, tenantId)))
      .limit(1);
    if (!template) throw new NotFoundException('Recurring invoice template not found');
    return template;
  }

  async create(tenantId: string, dto: { sourceInvoiceId: string; frequency: string; nextRunDate: string; endDate?: string }) {
    // Verify source invoice exists
    const [source] = await this.db.select().from(invoices)
      .where(and(eq(invoices.id, dto.sourceInvoiceId), eq(invoices.tenantId, tenantId)))
      .limit(1);
    if (!source) throw new BadRequestException('Source invoice not found');

    const [template] = await this.db.insert(recurringInvoiceTemplates).values({
      tenantId,
      sourceInvoiceId: dto.sourceInvoiceId,
      frequency: dto.frequency as 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'annually',
      nextRunDate: dto.nextRunDate,
      endDate: dto.endDate || null,
    }).returning();
    return template;
  }

  async update(tenantId: string, id: string, dto: { frequency?: string; nextRunDate?: string; endDate?: string; isActive?: boolean }) {
    await this.findById(tenantId, id);
    const [updated] = await this.db.update(recurringInvoiceTemplates)
      .set({
        ...(dto.frequency !== undefined && { frequency: dto.frequency as 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'annually' }),
        ...(dto.nextRunDate !== undefined && { nextRunDate: dto.nextRunDate }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(recurringInvoiceTemplates.id, id), eq(recurringInvoiceTemplates.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deactivate(tenantId: string, id: string) {
    return this.update(tenantId, id, { isActive: false });
  }

  async processRecurringInvoices(): Promise<Array<{ templateId: string; invoiceId: string }>> {
    const today = new Date().toISOString().split('T')[0];
    const dueTemplates = await this.db.select().from(recurringInvoiceTemplates)
      .where(and(
        eq(recurringInvoiceTemplates.isActive, true),
        lte(recurringInvoiceTemplates.nextRunDate, today),
      ));

    const results: Array<{ templateId: string; invoiceId: string }> = [];

    for (const template of dueTemplates) {
      // Check if end date has passed
      if (template.endDate && template.endDate < today) {
        await this.db.update(recurringInvoiceTemplates)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(recurringInvoiceTemplates.id, template.id));
        continue;
      }

      // Clone the source invoice
      const [source] = await this.db.select().from(invoices)
        .where(eq(invoices.id, template.sourceInvoiceId))
        .limit(1);
      if (!source) continue;

      // Get source lines
      const sourceLines = await this.db.select().from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, source.id));

      // Create new invoice with current dates
      const now = new Date();
      const issueDate = now.toISOString().split('T')[0];
      const dueOffset = source.dueDate && source.issueDate
        ? Math.floor((new Date(source.dueDate).getTime() - new Date(source.issueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      const dueDate = new Date(now.getTime() + dueOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [newInvoice] = await this.db.insert(invoices).values({
        tenantId: source.tenantId,
        invoiceNumber: await this.numberSeriesService.getNext(source.tenantId, 'invoice'),
        customerId: source.customerId,
        type: source.type,
        issueDate,
        dueDate,
        subtotal: source.subtotal,
        taxAmount: source.taxAmount,
        total: source.total,
        amountPaid: '0',
        balanceDue: source.total,
        status: 'draft',
        notes: source.notes,
        createdBy: source.createdBy,
      }).returning();

      // Clone lines
      if (sourceLines.length > 0) {
        await this.db.insert(invoiceLines).values(
          sourceLines.map((line) => ({
            tenantId: line.tenantId,
            invoiceId: newInvoice.id,
            lineNumber: line.lineNumber,
            productId: line.productId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitOfMeasure: line.unitOfMeasure,
            discountType: line.discountType,
            discountValue: line.discountValue,
            discountAmount: line.discountAmount,
            amount: line.amount,
            taxRateId: line.taxRateId,
            taxAmount: line.taxAmount,
            hsnCode: line.hsnCode,
            cgstRate: line.cgstRate,
            sgstRate: line.sgstRate,
            igstRate: line.igstRate,
            cgstAmount: line.cgstAmount,
            sgstAmount: line.sgstAmount,
            igstAmount: line.igstAmount,
            accountId: line.accountId,
            sortOrder: line.sortOrder,
          })),
        );
      }

      // Advance nextRunDate
      const nextDate = this.advanceDate(template.nextRunDate, template.frequency);
      await this.db.update(recurringInvoiceTemplates)
        .set({
          nextRunDate: nextDate,
          totalGenerated: sql`${recurringInvoiceTemplates.totalGenerated} + 1`,
          lastGeneratedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(recurringInvoiceTemplates.id, template.id));

      results.push({ templateId: template.id, invoiceId: newInvoice.id });
    }

    return results;
  }

  private advanceDate(currentDate: string, frequency: string): string {
    const d = new Date(currentDate);
    switch (frequency) {
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'half_yearly': d.setMonth(d.getMonth() + 6); break;
      case 'annually': d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString().split('T')[0];
  }
}
