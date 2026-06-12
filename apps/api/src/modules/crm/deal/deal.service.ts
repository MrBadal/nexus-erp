import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, isNull, desc, asc, ilike, or, sql, like } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  deals,
  dealStages,
  contacts,
  customers,
  quotations,
  quotationLines,
  type Deal,
  type NewDeal,
  type NewDealStage,
} from '../../../database/schema/index.js';
import { CreateDealDto } from './dto/create-deal.dto.js';
import { UpdateDealDto } from './dto/update-deal.dto.js';
import { UpdateDealStageDto } from './dto/update-deal-stage.dto.js';
import { CreateDealStageDto } from './dto/create-deal-stage.dto.js';

interface DealListOptions {
  stage?: string;
  contactId?: string;
  assignedTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface ConvertDealToQuotationDto {
  customerId: string;
  validUntil: string;
  currency?: string;
  notes?: string;
}

@Injectable()
export class DealService {
  private readonly logger = new Logger(DealService.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string, options?: DealListOptions) {
    const conditions: ReturnType<typeof eq>[] = [
      eq(deals.tenantId, tenantId),
      isNull(deals.deletedAt),
    ];

    if (options?.stage) {
      conditions.push(eq(deals.stage, options.stage as Deal['stage']));
    }

    if (options?.contactId) {
      conditions.push(eq(deals.contactId, options.contactId));
    }

    if (options?.assignedTo) {
      conditions.push(eq(deals.assignedTo, options.assignedTo));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(ilike(deals.title, searchTerm));
    }

    const whereClause = and(...conditions);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(deals)
      .where(whereClause);

    const sortColumn = options?.sortBy === 'value' ? deals.value
      : options?.sortBy === 'expected_close_date' ? deals.expectedCloseDate
      : options?.sortBy === 'stage' ? deals.stage
      : deals.createdAt;

    const orderFn = options?.sortOrder === 'asc' ? asc : desc;

    const data = await this.db
      .select()
      .from(deals)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return { data, total: countResult.count };
  }

  async findById(tenantId: string, id: string) {
    const [deal] = await this.db
      .select()
      .from(deals)
      .where(
        and(
          eq(deals.id, id),
          eq(deals.tenantId, tenantId),
          isNull(deals.deletedAt),
        ),
      )
      .limit(1);

    if (!deal) {
      throw new NotFoundException(`Deal with ID "${id}" not found`);
    }

    // Get contact info if linked
    let contact = null;
    if (deal.contactId) {
      const [contactResult] = await this.db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          company: contacts.company,
        })
        .from(contacts)
        .where(eq(contacts.id, deal.contactId))
        .limit(1);
      contact = contactResult || null;
    }

    return { ...deal, contact };
  }

  async create(tenantId: string, data: CreateDealDto) {
    // Validate contact if provided
    if (data.contactId) {
      const [contact] = await this.db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, data.contactId),
            eq(contacts.tenantId, tenantId),
            isNull(contacts.deletedAt),
          ),
        )
        .limit(1);

      if (!contact) {
        throw new BadRequestException(`Contact with ID "${data.contactId}" not found`);
      }
    }

    const [deal] = await this.db
      .insert(deals)
      .values({
        tenantId,
        title: data.title,
        contactId: data.contactId || null,
        value: data.value || null,
        currency: data.currency || 'INR',
        stage: (data.stage as NewDeal['stage']) || 'lead',
        stageId: data.stageId || null,
        probability: data.probability ?? 0,
        expectedCloseDate: data.expectedCloseDate || null,
        assignedTo: data.assignedTo || null,
        source: (data.source as NewDeal['source']) || null,
        description: data.description || null,
      })
      .returning();

    return deal;
  }

  async update(tenantId: string, id: string, data: UpdateDealDto) {
    await this.findById(tenantId, id);

    if (data.contactId) {
      const [contact] = await this.db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, data.contactId),
            eq(contacts.tenantId, tenantId),
            isNull(contacts.deletedAt),
          ),
        )
        .limit(1);

      if (!contact) {
        throw new BadRequestException(`Contact with ID "${data.contactId}" not found`);
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.contactId !== undefined) updateData.contactId = data.contactId;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.stage !== undefined) updateData.stage = data.stage;
    if (data.stageId !== undefined) updateData.stageId = data.stageId;
    if (data.probability !== undefined) updateData.probability = data.probability;
    if (data.expectedCloseDate !== undefined) updateData.expectedCloseDate = data.expectedCloseDate;
    if (data.actualCloseDate !== undefined) updateData.actualCloseDate = data.actualCloseDate;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.lostReason !== undefined) updateData.lostReason = data.lostReason;
    if (data.wonReason !== undefined) updateData.wonReason = data.wonReason;

    const [updated] = await this.db
      .update(deals)
      .set(updateData)
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStage(tenantId: string, id: string, data: UpdateDealStageDto) {
    const deal = await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = {
      stage: data.stage,
      updatedAt: new Date(),
    };

    if (data.stage === 'closed_won') {
      updateData.actualCloseDate = new Date().toISOString().split('T')[0];
      updateData.probability = 100;
      if (data.wonReason) updateData.wonReason = data.wonReason;
    } else if (data.stage === 'closed_lost') {
      updateData.actualCloseDate = new Date().toISOString().split('T')[0];
      updateData.probability = 0;
      if (data.lostReason) updateData.lostReason = data.lostReason;
    }

    const [updated] = await this.db
      .update(deals)
      .set(updateData)
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.db
      .update(deals)
      .set({ deletedAt: new Date() })
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)));

    return { message: 'Deal deleted successfully' };
  }

  async getPipelineSummary(tenantId: string) {
    const stageValues = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;

    const results = await this.db
      .select({
        stage: deals.stage,
        count: sql<number>`count(*)::int`,
        totalValue: sql<string>`coalesce(sum(${deals.value}), 0)::text`,
      })
      .from(deals)
      .where(
        and(
          eq(deals.tenantId, tenantId),
          isNull(deals.deletedAt),
        ),
      )
      .groupBy(deals.stage);

    // Ensure all stages are represented
    const stageMap = new Map(results.map((r) => [r.stage, r]));
    const pipeline = stageValues.map((stage) => ({
      stage,
      count: stageMap.get(stage)?.count ?? 0,
      totalValue: stageMap.get(stage)?.totalValue ?? '0',
    }));

    const totalDeals = pipeline.reduce((sum, s) => sum + s.count, 0);
    const totalValue = pipeline.reduce((sum, s) => sum + parseFloat(s.totalValue), 0);
    const wonDeals = pipeline.find((s) => s.stage === 'closed_won');
    const lostDeals = pipeline.find((s) => s.stage === 'closed_lost');

    return {
      stages: pipeline,
      summary: {
        totalDeals,
        totalValue: totalValue.toFixed(4),
        wonCount: wonDeals?.count ?? 0,
        wonValue: wonDeals?.totalValue ?? '0',
        lostCount: lostDeals?.count ?? 0,
        lostValue: lostDeals?.totalValue ?? '0',
      },
    };
  }

  // ─── Deal → Quotation Conversion ────────────────────────

  async convertToQuotation(tenantId: string, dealId: string, data: ConvertDealToQuotationDto) {
    const deal = await this.findById(tenantId, dealId);

    // Validate customer exists
    const [customer] = await this.db
      .select({ id: customers.id, name: customers.name })
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
      throw new BadRequestException(`Customer with ID "${data.customerId}" not found`);
    }

    // Generate quotation number
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
      .orderBy(desc(quotations.quotationNumber))
      .limit(1);

    let nextNum = 1;
    if (latest) {
      const current = parseInt(latest.quotationNumber.replace(prefix, ''), 10);
      if (!isNaN(current)) nextNum = current + 1;
    }
    const quotationNumber = `${prefix}${String(nextNum).padStart(6, '0')}`;

    const today = new Date().toISOString().split('T')[0];
    const dealValue = deal.value ? parseFloat(deal.value) : 0;

    // Create the quotation
    const [quotation] = await this.db
      .insert(quotations)
      .values({
        tenantId,
        quotationNumber,
        customerId: data.customerId,
        quotationDate: today,
        validUntil: data.validUntil,
        status: 'draft',
        subtotal: dealValue.toFixed(4),
        taxAmount: '0',
        discountAmount: '0',
        totalAmount: dealValue.toFixed(4),
        currency: data.currency || deal.currency || 'INR',
        notes: data.notes || `Converted from CRM Deal: ${deal.title}`,
      })
      .returning();

    // Advance deal stage to 'proposal' if currently before it
    const preProposalStages = ['lead', 'qualified'];
    if (preProposalStages.includes(deal.stage)) {
      await this.db
        .update(deals)
        .set({ stage: 'proposal', updatedAt: new Date() })
        .where(eq(deals.id, dealId));
    }

    this.logger.log(
      `Deal "${deal.title}" converted to Quotation ${quotationNumber} for customer ${customer.name}`,
    );

    return {
      quotationId: quotation.id,
      quotationNumber,
      dealId,
      dealTitle: deal.title,
      customerId: data.customerId,
      customerName: customer.name,
      totalAmount: quotation.totalAmount,
    };
  }

  // ─── Deal Stages ──────────────────────────────────────

  async findAllStages(tenantId: string) {
    return this.db
      .select()
      .from(dealStages)
      .where(
        and(
          eq(dealStages.tenantId, tenantId),
          isNull(dealStages.deletedAt),
        ),
      )
      .orderBy(asc(dealStages.order));
  }

  async createStage(tenantId: string, data: CreateDealStageDto) {
    const [stage] = await this.db
      .insert(dealStages)
      .values({
        tenantId,
        name: data.name,
        order: data.order,
        probability: data.probability ?? 0,
        color: data.color || null,
        isDefault: data.isDefault ?? false,
        isWon: data.isWon ?? false,
        isLost: data.isLost ?? false,
      })
      .returning();

    return stage;
  }
}
