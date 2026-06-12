import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { leads, contacts, deals, dealStages } from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';

export interface CreateLeadDto {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  estimatedValue?: string;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  status?: string;
  score?: number;
  assignedTo?: string;
}

export interface ConvertLeadDto {
  createDeal?: boolean;
  dealTitle?: string;
  dealValue?: string;
}

@Injectable()
export class LeadService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      source?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(leads.tenantId, tenantId),
      isNull(leads.deletedAt),
    ];

    if (options?.status) {
      conditions.push(eq(leads.status, options.status as 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost'));
    }

    if (options?.source) {
      conditions.push(eq(leads.source, options.source as 'website' | 'referral' | 'social_media' | 'cold_call' | 'trade_show' | 'email_campaign' | 'advertisement' | 'other'));
    }

    if (options?.search) {
      conditions.push(like(leads.name, `%${options.search}%`));
    }

    return this.db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [lead] = await this.db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.id, id),
          eq(leads.tenantId, tenantId),
          isNull(leads.deletedAt),
        ),
      )
      .limit(1);

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async create(tenantId: string, dto: CreateLeadDto) {
    const [lead] = await this.db
      .insert(leads)
      .values({
        tenantId,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        company: dto.company || null,
        jobTitle: dto.jobTitle || null,
        source: (dto.source as 'website' | 'referral' | 'social_media' | 'cold_call' | 'trade_show' | 'email_campaign' | 'advertisement' | 'other') || 'other',
        estimatedValue: dto.estimatedValue || null,
        notes: dto.notes || null,
        address: dto.address || null,
        city: dto.city || null,
        state: dto.state || null,
        country: dto.country || null,
      })
      .returning();

    return lead;
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto) {
    await this.findById(tenantId, id);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.email !== undefined) updates.email = dto.email;
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.company !== undefined) updates.company = dto.company;
    if (dto.jobTitle !== undefined) updates.jobTitle = dto.jobTitle;
    if (dto.source !== undefined) updates.source = dto.source;
    if (dto.estimatedValue !== undefined) updates.estimatedValue = dto.estimatedValue;
    if (dto.notes !== undefined) updates.notes = dto.notes;
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.score !== undefined) updates.score = dto.score;
    if (dto.assignedTo !== undefined) updates.assignedTo = dto.assignedTo;

    const [updated] = await this.db
      .update(leads)
      .set(updates)
      .where(eq(leads.id, id))
      .returning();

    return updated;
  }

  async convertToContact(tenantId: string, id: string, dto: ConvertLeadDto) {
    const lead = await this.findById(tenantId, id);

    if (lead.status === 'converted') {
      throw new BadRequestException('Lead is already converted');
    }

    // Map lead source to contact source (contact_source has fewer values)
    const contactSourceMap: Record<string, 'website' | 'referral' | 'cold_call' | 'trade_show' | 'social_media' | 'other'> = {
      website: 'website',
      referral: 'referral',
      social_media: 'social_media',
      cold_call: 'cold_call',
      trade_show: 'trade_show',
      email_campaign: 'other',
      advertisement: 'other',
      other: 'other',
    };
    const mappedSource = contactSourceMap[lead.source] || 'other';

    // Create a CRM contact from the lead
    const [contact] = await this.db
      .insert(contacts)
      .values({
        tenantId,
        firstName: lead.name.split(' ')[0] || lead.name,
        lastName: lead.name.split(' ').slice(1).join(' ') || '',
        email: lead.email || '',
        phone: lead.phone || null,
        company: lead.company || null,
        jobTitle: lead.jobTitle || null,
        type: 'lead',
        source: mappedSource,
        address: lead.address || null,
        city: lead.city || null,
        state: lead.state || null,
        country: lead.country || null,
        notes: lead.notes || null,
      })
      .returning();

    const updates: Record<string, unknown> = {
      status: 'converted',
      convertedContactId: contact.id,
      convertedAt: new Date(),
      updatedAt: new Date(),
    };

    // Optionally create a deal
    let dealId: string | null = null;
    if (dto.createDeal) {
      // Find first deal stage
      const [stage] = await this.db
        .select()
        .from(dealStages)
        .where(eq(dealStages.tenantId, tenantId))
        .limit(1);

      if (stage) {
        const [deal] = await this.db
          .insert(deals)
          .values({
            tenantId,
            title: dto.dealTitle || `${lead.name} - Deal`,
            contactId: contact.id,
            stageId: stage.id,
            value: dto.dealValue || lead.estimatedValue || '0',
            probability: 20,
            source: mappedSource,
          })
          .returning();

        dealId = deal.id;
        updates.convertedDealId = dealId;
      }
    }

    await this.db
      .update(leads)
      .set(updates)
      .where(eq(leads.id, id));

    return {
      leadId: id,
      contactId: contact.id,
      dealId,
      status: 'converted',
    };
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.db
      .update(leads)
      .set({ deletedAt: new Date() })
      .where(eq(leads.id, id));
  }
}
