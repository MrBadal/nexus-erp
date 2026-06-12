import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  dprs,
  dprWorkItems,
} from '../../../database/schema/index.js';

interface CreateDprWorkItemDto {
  boqItemId?: string;
  description: string;
  unit: string;
  quantityToday: string;
  cumulativeQuantity: string;
  remarks?: string;
}

interface CreateDprDto {
  contractId: string;
  reportDate: string;
  weather?: string;
  temperature?: string;
  skilledLabour?: number;
  unskilledLabour?: number;
  supervisors?: number;
  engineers?: number;
  equipmentDetails?: unknown;
  workDoneToday?: string;
  issuesObserved?: string;
  nextDayPlan?: string;
  visitorsOnSite?: string;
  workItems?: CreateDprWorkItemDto[];
}

@Injectable()
export class DprService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: { contractId?: string; status?: string },
  ) {
    const conditions = [eq(dprs.tenantId, tenantId)];

    if (options?.contractId) {
      conditions.push(eq(dprs.contractId, options.contractId));
    }

    if (options?.status) {
      conditions.push(eq(dprs.status, options.status as 'draft' | 'submitted' | 'approved'));
    }

    return this.db
      .select()
      .from(dprs)
      .where(and(...conditions))
      .orderBy(desc(dprs.reportDate));
  }

  async findById(tenantId: string, id: string) {
    const [dpr] = await this.db
      .select()
      .from(dprs)
      .where(and(eq(dprs.id, id), eq(dprs.tenantId, tenantId)))
      .limit(1);

    if (!dpr) {
      throw new NotFoundException(`DPR with ID "${id}" not found`);
    }

    const workItems = await this.db
      .select()
      .from(dprWorkItems)
      .where(eq(dprWorkItems.dprId, id));

    return { ...dpr, workItems };
  }

  async create(tenantId: string, userId: string, data: CreateDprDto) {
    const dprNumber = await this.generateDprNumber(tenantId, data.contractId, data.reportDate);

    const [dpr] = await this.db
      .insert(dprs)
      .values({
        tenantId,
        contractId: data.contractId,
        dprNumber,
        reportDate: data.reportDate,
        status: 'draft',
        weather: data.weather || null,
        temperature: data.temperature || null,
        skilledLabour: data.skilledLabour ?? 0,
        unskilledLabour: data.unskilledLabour ?? 0,
        supervisors: data.supervisors ?? 0,
        engineers: data.engineers ?? 0,
        equipmentDetails: (data.equipmentDetails as Record<string, unknown>) ?? null,
        workDoneToday: data.workDoneToday || null,
        issuesObserved: data.issuesObserved || null,
        nextDayPlan: data.nextDayPlan || null,
        visitorsOnSite: data.visitorsOnSite || null,
      })
      .returning();

    if (data.workItems && data.workItems.length > 0) {
      await this.db.insert(dprWorkItems).values(
        data.workItems.map((item) => ({
          dprId: dpr.id,
          boqItemId: item.boqItemId || null,
          description: item.description,
          unit: item.unit,
          quantityToday: item.quantityToday,
          cumulativeQuantity: item.cumulativeQuantity,
          remarks: item.remarks || null,
        })),
      );
    }

    return this.findById(tenantId, dpr.id);
  }

  async submit(tenantId: string, id: string, userId: string) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(dprs)
      .set({ status: 'submitted', submittedBy: userId, updatedAt: new Date() })
      .where(and(eq(dprs.id, id), eq(dprs.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async approve(tenantId: string, id: string, userId: string) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(dprs)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(dprs.id, id), eq(dprs.tenantId, tenantId)))
      .returning();

    return updated;
  }

  private async generateDprNumber(
    tenantId: string,
    contractId: string,
    reportDate: string,
  ): Promise<string> {
    // Format: DPR-YYYYMMDD-{seq}
    const dateStr = reportDate.replace(/-/g, '');

    const existing = await this.db
      .select({ dprNumber: dprs.dprNumber })
      .from(dprs)
      .where(
        and(
          eq(dprs.tenantId, tenantId),
          eq(dprs.contractId, contractId),
          eq(dprs.reportDate, reportDate),
        ),
      );

    const seq = (existing.length + 1).toString().padStart(2, '0');
    return `DPR-${dateStr}-${seq}`;
  }
}
