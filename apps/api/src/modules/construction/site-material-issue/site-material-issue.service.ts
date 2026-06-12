import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, desc, like } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  siteMaterialIssues,
  siteMaterialIssueLines,
} from '../../../database/schema/index.js';
import { EVENTS } from '../../../common/events.constants.js';

interface CreateSiteMaterialIssueDto {
  contractId: string;
  issueDate: string;
  warehouseId: string;
  issuedTo?: string;
  boqItemId?: string;
  notes?: string;
  lines: {
    itemId: string;
    itemDescription?: string;
    unit: string;
    quantityIssued: string;
    unitRate: string;
  }[];
}

@Injectable()
export class SiteMaterialIssueService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    tenantId: string,
    options?: { contractId?: string; status?: string },
  ) {
    const conditions = [
      eq(siteMaterialIssues.tenantId, tenantId),
      isNull(siteMaterialIssues.deletedAt),
    ];
    if (options?.contractId) {
      conditions.push(eq(siteMaterialIssues.contractId, options.contractId));
    }
    if (options?.status) {
      conditions.push(eq(siteMaterialIssues.status, options.status as any));
    }

    return this.db
      .select()
      .from(siteMaterialIssues)
      .where(and(...conditions))
      .orderBy(desc(siteMaterialIssues.createdAt));
  }

  async findById(tenantId: string, id: string) {
    const [issue] = await this.db
      .select()
      .from(siteMaterialIssues)
      .where(
        and(
          eq(siteMaterialIssues.id, id),
          eq(siteMaterialIssues.tenantId, tenantId),
          isNull(siteMaterialIssues.deletedAt),
        ),
      )
      .limit(1);

    if (!issue) throw new NotFoundException(`Site Material Issue with ID "${id}" not found`);

    const lines = await this.db
      .select()
      .from(siteMaterialIssueLines)
      .where(eq(siteMaterialIssueLines.issueId, id));

    return { ...issue, lines };
  }

  async create(tenantId: string, userId: string, data: CreateSiteMaterialIssueDto) {
    const issueNumber = await this.generateIssueNumber(tenantId);

    const totalValue = data.lines.reduce((sum, l) => {
      return sum + parseFloat(l.quantityIssued) * parseFloat(l.unitRate);
    }, 0);

    const [issue] = await this.db
      .insert(siteMaterialIssues)
      .values({
        tenantId,
        contractId: data.contractId,
        issueNumber,
        issueDate: data.issueDate,
        status: 'draft',
        warehouseId: data.warehouseId,
        issuedTo: data.issuedTo || null,
        boqItemId: data.boqItemId || null,
        totalValue: totalValue.toFixed(2),
        notes: data.notes || null,
        createdBy: userId,
      })
      .returning();

    if (data.lines.length > 0) {
      await this.db.insert(siteMaterialIssueLines).values(
        data.lines.map((l) => ({
          issueId: issue.id,
          itemId: l.itemId,
          itemDescription: l.itemDescription || null,
          unit: l.unit,
          quantityIssued: l.quantityIssued,
          unitRate: l.unitRate,
          amount: (parseFloat(l.quantityIssued) * parseFloat(l.unitRate)).toFixed(2),
        })),
      );
    }

    return this.findById(tenantId, issue.id);
  }

  async approve(tenantId: string, id: string, userId: string) {
    const issue = await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(siteMaterialIssues)
      .set({ status: 'approved', approvedBy: userId, updatedAt: new Date() })
      .where(and(eq(siteMaterialIssues.id, id), eq(siteMaterialIssues.tenantId, tenantId)))
      .returning();

    // Emit event → IntegrationService: reduce inventory stock + post WIP GL journal
    this.eventEmitter.emit(EVENTS.SITE_MATERIAL_ISSUE_ISSUED, {
      issueId: id,
      tenantId,
      contractId: issue.contractId,
      warehouseId: issue.warehouseId,
      boqItemId: issue.boqItemId,
      totalValue: issue.totalValue,
      lines: issue.lines.map((l) => ({
        itemId: l.itemId,
        quantityIssued: l.quantityIssued,
        unitRate: l.unitRate,
        amount: l.amount,
      })),
    });

    return updated;
  }

  private async generateIssueNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SMI-${year}-`;
    const all = await this.db
      .select({ issueNumber: siteMaterialIssues.issueNumber })
      .from(siteMaterialIssues)
      .where(
        and(
          eq(siteMaterialIssues.tenantId, tenantId),
          like(siteMaterialIssues.issueNumber, `${prefix}%`),
        ),
      );
    return `${prefix}${(all.length + 1).toString().padStart(4, '0')}`;
  }
}
