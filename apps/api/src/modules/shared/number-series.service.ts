import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { numberSeries } from '../../database/schema/index.js';

@Injectable()
export class NumberSeriesService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  /**
   * Get the next document number for a given type.
   * Atomically increments the counter to prevent duplicates.
   */
  async getNext(tenantId: string, documentType: string): Promise<string> {
    const year = new Date().getFullYear();

    // Try to find existing series for this tenant + document type
    const [existing] = await this.db
      .select()
      .from(numberSeries)
      .where(
        and(
          eq(numberSeries.tenantId, tenantId),
          eq(numberSeries.documentType, documentType),
        ),
      )
      .limit(1);

    if (existing) {
      // Atomic increment
      const [updated] = await this.db
        .update(numberSeries)
        .set({
          currentNumber: sql`${numberSeries.currentNumber} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(numberSeries.id, existing.id))
        .returning();

      const num = updated.currentNumber.toString().padStart(updated.padLength, '0');
      return `${updated.prefix}${num}${updated.suffix || ''}`;
    }

    // Auto-create series with sensible defaults
    const prefixMap: Record<string, string> = {
      invoice: `INV-${year}-`,
      bill: `BILL-${year}-`,
      payment: `PAY-${year}-`,
      sales_order: `SO-${year}-`,
      purchase_order: `PO-${year}-`,
      delivery_note: `DN-${year}-`,
      quotation: `QTN-${year}-`,
      supplier_quotation: `SQ-${year}-`,
      journal_entry: `JE-${year}-`,
      purchase_receipt: `GRN-${year}-`,
      stock_adjustment: `ADJ-${year}-`,
    };

    const prefix = prefixMap[documentType] || `${documentType.toUpperCase()}-${year}-`;

    const [created] = await this.db
      .insert(numberSeries)
      .values({
        tenantId,
        documentType,
        prefix,
        currentNumber: 1,
        padLength: 6,
        fiscalYear: `${year}-${(year + 1).toString().slice(-2)}`,
        resetAnnually: true,
      })
      .returning();

    const num = created.currentNumber.toString().padStart(created.padLength, '0');
    return `${created.prefix}${num}${created.suffix || ''}`;
  }

  /**
   * List all number series for a tenant.
   */
  async findAll(tenantId: string) {
    return this.db
      .select()
      .from(numberSeries)
      .where(eq(numberSeries.tenantId, tenantId))
      .orderBy(numberSeries.documentType);
  }

  /**
   * Update a number series configuration.
   */
  async update(
    tenantId: string,
    id: string,
    dto: { prefix?: string; suffix?: string; padLength?: number; resetAnnually?: boolean },
  ) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.prefix !== undefined) updates.prefix = dto.prefix;
    if (dto.suffix !== undefined) updates.suffix = dto.suffix;
    if (dto.padLength !== undefined) updates.padLength = dto.padLength;
    if (dto.resetAnnually !== undefined) updates.resetAnnually = dto.resetAnnually;

    const [updated] = await this.db
      .update(numberSeries)
      .set(updates)
      .where(and(eq(numberSeries.id, id), eq(numberSeries.tenantId, tenantId)))
      .returning();

    return updated;
  }

  /**
   * Seed default number series for a new tenant.
   */
  async seedDefaults(tenantId: string): Promise<void> {
    const year = new Date().getFullYear();
    const types = [
      'invoice', 'bill', 'payment', 'sales_order', 'purchase_order',
      'delivery_note', 'quotation', 'supplier_quotation', 'journal_entry',
      'purchase_receipt', 'stock_adjustment',
    ];

    const prefixMap: Record<string, string> = {
      invoice: `INV-${year}-`,
      bill: `BILL-${year}-`,
      payment: `PAY-${year}-`,
      sales_order: `SO-${year}-`,
      purchase_order: `PO-${year}-`,
      delivery_note: `DN-${year}-`,
      quotation: `QTN-${year}-`,
      supplier_quotation: `SQ-${year}-`,
      journal_entry: `JE-${year}-`,
      purchase_receipt: `GRN-${year}-`,
      stock_adjustment: `ADJ-${year}-`,
    };

    for (const type of types) {
      const [existing] = await this.db
        .select()
        .from(numberSeries)
        .where(
          and(
            eq(numberSeries.tenantId, tenantId),
            eq(numberSeries.documentType, type),
          ),
        )
        .limit(1);

      if (!existing) {
        await this.db.insert(numberSeries).values({
          tenantId,
          documentType: type,
          prefix: prefixMap[type] || `${type.toUpperCase()}-${year}-`,
          currentNumber: 0,
          padLength: 6,
          fiscalYear: `${year}-${(year + 1).toString().slice(-2)}`,
          resetAnnually: true,
        });
      }
    }
  }
}
