import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  supplierQuotations,
  supplierQuotationLines,
  suppliers,
  purchaseOrders,
  purchaseOrderLines,
} from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';
import { CreateSupplierQuotationDto } from './dto/create-supplier-quotation.dto.js';

@Injectable()
export class SupplierQuotationService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
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
      eq(supplierQuotations.tenantId, tenantId),
      isNull(supplierQuotations.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(supplierQuotations.status, options.status as 'draft' | 'received' | 'accepted' | 'rejected'),
      );
    }

    if (options?.supplierId) {
      conditions.push(eq(supplierQuotations.supplierId, options.supplierId));
    }

    if (options?.search) {
      conditions.push(like(supplierQuotations.quotationNumber, `%${options.search}%`));
    }

    return this.db
      .select()
      .from(supplierQuotations)
      .where(and(...conditions))
      .orderBy(desc(supplierQuotations.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [quotation] = await this.db
      .select()
      .from(supplierQuotations)
      .where(
        and(
          eq(supplierQuotations.id, id),
          eq(supplierQuotations.tenantId, tenantId),
          isNull(supplierQuotations.deletedAt),
        ),
      )
      .limit(1);

    if (!quotation) {
      throw new NotFoundException(`Supplier quotation with ID "${id}" not found`);
    }

    const lines = await this.db
      .select()
      .from(supplierQuotationLines)
      .where(eq(supplierQuotationLines.quotationId, id));

    return { ...quotation, lines };
  }

  async create(tenantId: string, data: CreateSupplierQuotationDto) {
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

    const quotationNumber = await this.generateNumber(tenantId);

    let totalAmount = 0;
    const lineData = data.lines.map((line) => {
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      totalAmount += qty * price;
      return line;
    });

    const [quotation] = await this.db
      .insert(supplierQuotations)
      .values({
        tenantId,
        quotationNumber,
        supplierId: data.supplierId,
        requestDate: data.requestDate,
        validUntil: data.validUntil || null,
        status: 'draft',
        notes: data.notes || null,
        totalAmount: totalAmount.toFixed(4),
      })
      .returning();

    if (lineData.length > 0) {
      await this.db.insert(supplierQuotationLines).values(
        lineData.map((line) => ({
          quotationId: quotation.id,
          itemId: line.itemId,
          description: line.description || null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          leadTime: line.leadTime ?? null,
        })),
      );
    }

    return this.findById(tenantId, quotation.id);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'received' | 'accepted' | 'rejected',
  ) {
    const quotation = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['received'],
      received: ['accepted', 'rejected'],
    };

    const allowed = validTransitions[quotation.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${quotation.status}" to "${newStatus}"`,
      );
    }

    const [updated] = await this.db
      .update(supplierQuotations)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(supplierQuotations.id, id), eq(supplierQuotations.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const quotation = await this.findById(tenantId, id);

    if (quotation.status !== 'draft') {
      throw new BadRequestException('Only draft quotations can be deleted');
    }

    const [deleted] = await this.db
      .update(supplierQuotations)
      .set({ deletedAt: new Date() })
      .where(and(eq(supplierQuotations.id, id), eq(supplierQuotations.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  /**
   * Converts an accepted supplier quotation to a purchase order.
   * Copies SQ lines → PO lines, marks SQ as 'accepted' if 'received',
   * links PO via notes reference.
   */
  async convertToPurchaseOrder(tenantId: string, id: string, userId: string) {
    const sq = await this.findById(tenantId, id);

    if (sq.status !== 'accepted' && sq.status !== 'received') {
      throw new BadRequestException(
        `Only received or accepted supplier quotations can be converted to purchase orders. Current status: ${sq.status}`,
      );
    }

    // Check if already converted (search PO notes for reference)
    const existingPOs = await this.db
      .select({ id: purchaseOrders.id })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          isNull(purchaseOrders.deletedAt),
          sql`${purchaseOrders.notes} LIKE ${'%' + sq.quotationNumber + '%'}`,
        ),
      )
      .limit(1);

    if (existingPOs.length > 0) {
      throw new BadRequestException('A purchase order already exists for this supplier quotation');
    }

    const orderNumber = await this.numberSeriesService.getNext(tenantId, 'purchase_order');
    const today = new Date().toISOString().split('T')[0];

    // Calculate totals from lines
    let subtotal = 0;
    const lineData = sq.lines.map((line) => {
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      const lineTotal = qty * price;
      subtotal += lineTotal;
      return { ...line, lineTotal: lineTotal.toFixed(4) };
    });

    const [po] = await this.db
      .insert(purchaseOrders)
      .values({
        tenantId,
        orderNumber,
        supplierId: sq.supplierId,
        orderDate: today,
        expectedDelivery: null,
        status: 'draft',
        subtotal: subtotal.toFixed(4),
        taxAmount: '0',
        discountAmount: '0',
        totalAmount: subtotal.toFixed(4),
        notes: `From Supplier Quotation ${sq.quotationNumber}`,
        createdBy: userId,
      })
      .returning();

    // Copy SQ lines → PO lines
    if (lineData.length > 0) {
      await this.db.insert(purchaseOrderLines).values(
        lineData.map((line) => ({
          purchaseOrderId: po.id,
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: '0',
          taxRate: '0',
          lineTotal: line.lineTotal,
        })),
      );
    }

    // Mark SQ as accepted if it was 'received'
    if (sq.status === 'received') {
      await this.db
        .update(supplierQuotations)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(and(eq(supplierQuotations.id, id), eq(supplierQuotations.tenantId, tenantId)));
    }

    // Return the full PO with lines
    const poLines = await this.db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, po.id));

    return { ...po, lines: poLines };
  }

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SQT-${year}-`;

    const [latest] = await this.db
      .select({ quotationNumber: supplierQuotations.quotationNumber })
      .from(supplierQuotations)
      .where(
        and(
          eq(supplierQuotations.tenantId, tenantId),
          like(supplierQuotations.quotationNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${supplierQuotations.quotationNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.quotationNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) sequence = lastNum + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
