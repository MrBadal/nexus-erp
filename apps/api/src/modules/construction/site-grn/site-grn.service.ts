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
  siteGrns,
  siteGrnLines,
  constructionContracts,
  type NewSiteGrn,
} from '../../../database/schema/index.js';
import { EVENTS } from '../../../common/events.constants.js';

interface CreateSiteGrnDto {
  contractId: string;
  grnDate: string;
  workOrderId?: string;
  supplierName?: string;
  vehicleNumber?: string;
  challanNumber?: string;
  warehouseId: string;
  notes?: string;
  lines: {
    itemId: string;
    itemDescription?: string;
    unit: string;
    quantityOrdered?: string;
    quantityReceived: string;
    quantityRejected?: string;
    unitRate: string;
    boqItemId?: string;
  }[];
}

@Injectable()
export class SiteGrnService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    tenantId: string,
    options?: { contractId?: string; status?: string; limit?: number; offset?: number },
  ) {
    const conditions = [eq(siteGrns.tenantId, tenantId), isNull(siteGrns.deletedAt)];
    if (options?.contractId) conditions.push(eq(siteGrns.contractId, options.contractId));
    if (options?.status) conditions.push(eq(siteGrns.status, options.status as any));

    return this.db
      .select()
      .from(siteGrns)
      .where(and(...conditions))
      .orderBy(desc(siteGrns.grnDate))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [grn] = await this.db
      .select()
      .from(siteGrns)
      .where(and(eq(siteGrns.id, id), eq(siteGrns.tenantId, tenantId), isNull(siteGrns.deletedAt)))
      .limit(1);

    if (!grn) throw new NotFoundException(`Site GRN with ID "${id}" not found`);

    const lines = await this.db.select().from(siteGrnLines).where(eq(siteGrnLines.siteGrnId, id));
    return { ...grn, lines };
  }

  async create(tenantId: string, userId: string, data: CreateSiteGrnDto) {
    const [contract] = await this.db
      .select()
      .from(constructionContracts)
      .where(and(eq(constructionContracts.id, data.contractId), eq(constructionContracts.tenantId, tenantId)))
      .limit(1);

    if (!contract) throw new BadRequestException('Contract not found');

    const grnNumber = await this.generateGrnNumber(tenantId);

    const totalValue = data.lines.reduce((sum, l) => {
      return sum + parseFloat(l.quantityReceived) * parseFloat(l.unitRate);
    }, 0);

    const [grn] = await this.db
      .insert(siteGrns)
      .values({
        tenantId,
        contractId: data.contractId,
        grnNumber,
        grnDate: data.grnDate,
        status: 'draft',
        workOrderId: data.workOrderId || null,
        supplierName: data.supplierName || null,
        vehicleNumber: data.vehicleNumber || null,
        challanNumber: data.challanNumber || null,
        warehouseId: data.warehouseId || null,
        totalValue: totalValue.toFixed(2),
        receivedBy: userId,
        notes: data.notes || null,
      })
      .returning();

    if (data.lines.length > 0) {
      await this.db.insert(siteGrnLines).values(
        data.lines.map((l) => ({
          siteGrnId: grn.id,
          itemId: l.itemId,
          itemDescription: l.itemDescription || null,
          unit: l.unit,
          quantityOrdered: l.quantityOrdered || null,
          quantityReceived: l.quantityReceived,
          quantityRejected: l.quantityRejected || '0',
          unitRate: l.unitRate,
          amount: (parseFloat(l.quantityReceived) * parseFloat(l.unitRate)).toFixed(2),
          boqItemId: l.boqItemId || null,
        })),
      );
    }

    return this.findById(tenantId, grn.id);
  }

  async approve(tenantId: string, id: string, userId: string) {
    const grn = await this.findById(tenantId, id);

    if (grn.status !== 'submitted') {
      throw new BadRequestException(`Cannot approve GRN with status "${grn.status}"`);
    }

    const [updated] = await this.db
      .update(siteGrns)
      .set({ status: 'approved', approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(siteGrns.id, id))
      .returning();

    // Emit event → IntegrationService: update inventory stock + post accrual journal
    this.eventEmitter.emit(EVENTS.SITE_GRN_COMPLETED, {
      grnId: id,
      tenantId,
      grnNumber: grn.grnNumber,
      contractId: grn.contractId,
      warehouseId: grn.warehouseId,
      totalValue: grn.totalValue,
      lines: grn.lines.map((l) => ({
        itemId: l.itemId,
        acceptedQty: l.quantityReceived,
        unitCost: l.unitRate,
      })),
    });

    return updated;
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findById(tenantId, id);
    const [updated] = await this.db
      .update(siteGrns)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(eq(siteGrns.id, id), eq(siteGrns.tenantId, tenantId)))
      .returning();
    return updated;
  }

  private async generateGrnNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SGRN-${year}-`;
    const all = await this.db
      .select({ grnNumber: siteGrns.grnNumber })
      .from(siteGrns)
      .where(and(eq(siteGrns.tenantId, tenantId), like(siteGrns.grnNumber, `${prefix}%`)));
    return `${prefix}${(all.length + 1).toString().padStart(4, '0')}`;
  }
}
