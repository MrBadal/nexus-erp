import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, isNull, desc, asc, or, ilike, inArray, sql, gte, lte } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { leads, contacts, deals, dealStages, activities, users } from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';

type LeadSource = 'website' | 'referral' | 'social_media' | 'cold_call' | 'trade_show' | 'email_campaign' | 'advertisement' | 'other';
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
type LeadPriority = 'low' | 'medium' | 'high';
type Disposition =
  | 'connected' | 'no_answer' | 'busy' | 'switched_off' | 'wrong_number'
  | 'callback' | 'interested' | 'not_interested' | 'do_not_call' | 'converted';

/** Who is acting, and what they're allowed to see/do (derived from permissions). */
export interface Actor {
  userId: string;
  canSeeAll: boolean; // crm:read_all or admin — managers see every lead
  canAssign: boolean; // crm:assign or admin — can hand leads to other users
}

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
  assignedTo?: string;
  priority?: string;
  nextFollowUpAt?: string;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  status?: string;
  score?: number;
  lostReason?: string;
}

export interface LogCallDto {
  disposition: string;
  notes?: string;
  durationMinutes?: number;
  direction?: 'inbound' | 'outbound';
  nextFollowUpAt?: string;
  status?: string;
}

export interface ConvertLeadDto {
  createDeal?: boolean;
  dealTitle?: string;
  dealValue?: string;
}

const TERMINAL: Disposition[] = ['not_interested', 'do_not_call'];

@Injectable()
export class LeadService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
  ) {}

  // ─── Ownership helpers ──────────────────────────────────

  /** Rows a non-manager may see: their own leads + the unassigned (claimable) pool. */
  private ownershipCondition(actor: Actor) {
    if (actor.canSeeAll) return undefined;
    return or(eq(leads.assignedTo, actor.userId), isNull(leads.assignedTo));
  }

  /** Attach the owner's display name to a set of lead rows (one lookup). */
  private async withOwners<T extends { assignedTo: string | null }>(rows: T[]): Promise<(T & { ownerName: string | null })[]> {
    const ids = [...new Set(rows.map((r) => r.assignedTo).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (ids.length) {
      const owners = await this.db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, ids));
      for (const o of owners) names.set(o.id, `${o.firstName} ${o.lastName}`.trim());
    }
    return rows.map((r) => ({ ...r, ownerName: r.assignedTo ? names.get(r.assignedTo) ?? null : null }));
  }

  // ─── Queries ────────────────────────────────────────────

  async findAll(
    tenantId: string,
    options: {
      status?: string;
      source?: string;
      search?: string;
      priority?: string;
      assignedTo?: string;
      mine?: boolean;
      followUpDue?: 'overdue' | 'today' | 'week';
      sort?: 'recent' | 'followup';
      limit?: number;
      offset?: number;
    },
    actor: Actor,
  ) {
    const conditions = [eq(leads.tenantId, tenantId), isNull(leads.deletedAt)];

    const scope = this.ownershipCondition(actor);
    if (scope) conditions.push(scope);

    if (options.mine) conditions.push(eq(leads.assignedTo, actor.userId));
    if (options.assignedTo) conditions.push(eq(leads.assignedTo, options.assignedTo));
    if (options.status) conditions.push(eq(leads.status, options.status as LeadStatus));
    if (options.source) conditions.push(eq(leads.source, options.source as LeadSource));
    if (options.priority) conditions.push(eq(leads.priority, options.priority as LeadPriority));
    if (options.search) {
      const term = `%${options.search}%`;
      conditions.push(
        or(ilike(leads.name, term), ilike(leads.company, term), ilike(leads.phone, term), ilike(leads.email, term))!,
      );
    }

    // Follow-up windows (for the telecaller work queue)
    if (options.followUpDue) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
      if (options.followUpDue === 'overdue') {
        conditions.push(and(sql`${leads.nextFollowUpAt} is not null`, lte(leads.nextFollowUpAt, now))!);
      } else if (options.followUpDue === 'today') {
        conditions.push(and(gte(leads.nextFollowUpAt, startOfToday), lte(leads.nextFollowUpAt, endOfToday))!);
      } else if (options.followUpDue === 'week') {
        const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
        conditions.push(and(gte(leads.nextFollowUpAt, startOfToday), lte(leads.nextFollowUpAt, endOfWeek))!);
      }
    }

    const order = options.sort === 'followup' ? asc(leads.nextFollowUpAt) : desc(leads.createdAt);

    const rows = await this.db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(order)
      .limit(options.limit || 50)
      .offset(options.offset || 0);

    return this.withOwners(rows);
  }

  /** Counters for the work-queue tabs (scoped to the actor). */
  async queueCounts(tenantId: string, actor: Actor) {
    const base = [eq(leads.tenantId, tenantId), isNull(leads.deletedAt)];
    const scope = this.ownershipCondition(actor);
    if (scope) base.push(scope);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const count = async (extra: ReturnType<typeof and>[]) => {
      const [r] = await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(leads)
        .where(and(...base, ...extra));
      return Number(r?.n ?? 0);
    };

    const notClosed = sql`${leads.status} not in ('converted','lost','unqualified')`;
    return {
      dueToday: await count([gte(leads.nextFollowUpAt, startOfToday), lte(leads.nextFollowUpAt, endOfToday), notClosed]),
      overdue: await count([sql`${leads.nextFollowUpAt} is not null`, lte(leads.nextFollowUpAt, now), notClosed]),
      newUnassigned: await count([isNull(leads.assignedTo), eq(leads.status, 'new')]),
      mine: await count([eq(leads.assignedTo, actor.userId), notClosed]),
    };
  }

  async findById(tenantId: string, id: string, actor: Actor) {
    const [lead] = await this.db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId), isNull(leads.deletedAt)))
      .limit(1);

    if (!lead) throw new NotFoundException('Lead not found');
    // Non-managers can only open their own leads or unassigned ones.
    if (!actor.canSeeAll && lead.assignedTo && lead.assignedTo !== actor.userId) {
      throw new NotFoundException('Lead not found');
    }
    const [enriched] = await this.withOwners([lead]);
    return enriched;
  }

  async getActivities(tenantId: string, id: string, actor: Actor) {
    await this.findById(tenantId, id, actor); // access check
    const rows = await this.db
      .select({
        id: activities.id,
        type: activities.type,
        subject: activities.subject,
        description: activities.description,
        disposition: activities.disposition,
        direction: activities.direction,
        durationMinutes: activities.durationMinutes,
        status: activities.status,
        completedAt: activities.completedAt,
        dueDate: activities.dueDate,
        createdAt: activities.createdAt,
        byUserId: activities.assignedTo,
      })
      .from(activities)
      .where(and(eq(activities.tenantId, tenantId), eq(activities.leadId, id), isNull(activities.deletedAt)))
      .orderBy(desc(activities.createdAt));

    // resolve "by" names
    const ids = [...new Set(rows.map((r) => r.byUserId).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (ids.length) {
      const us = await this.db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, ids));
      for (const u of us) names.set(u.id, `${u.firstName} ${u.lastName}`.trim());
    }
    return rows.map((r) => ({ ...r, byName: r.byUserId ? names.get(r.byUserId) ?? null : null }));
  }

  // ─── Mutations ──────────────────────────────────────────

  async create(tenantId: string, dto: CreateLeadDto, actor: Actor) {
    // Owner: managers may assign to anyone; otherwise the creator owns it.
    let assignedTo: string | null = actor.userId;
    if (dto.assignedTo) {
      if (dto.assignedTo !== actor.userId && !actor.canAssign) {
        throw new ForbiddenException('You cannot assign leads to other users');
      }
      assignedTo = dto.assignedTo;
    }

    const [lead] = await this.db
      .insert(leads)
      .values({
        tenantId,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        company: dto.company || null,
        jobTitle: dto.jobTitle || null,
        source: (dto.source as LeadSource) || 'other',
        estimatedValue: dto.estimatedValue || null,
        notes: dto.notes || null,
        address: dto.address || null,
        city: dto.city || null,
        state: dto.state || null,
        country: dto.country || null,
        assignedTo,
        priority: (dto.priority as LeadPriority) || 'medium',
        nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null,
      })
      .returning();

    return lead;
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto, actor: Actor) {
    await this.findById(tenantId, id, actor);

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
    if (dto.priority !== undefined) updates.priority = dto.priority;
    if (dto.lostReason !== undefined) updates.lostReason = dto.lostReason;
    if (dto.nextFollowUpAt !== undefined) {
      updates.nextFollowUpAt = dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null;
    }
    if (dto.assignedTo !== undefined) {
      if (dto.assignedTo && dto.assignedTo !== actor.userId && !actor.canAssign) {
        throw new ForbiddenException('You cannot assign leads to other users');
      }
      updates.assignedTo = dto.assignedTo || null;
    }

    const [updated] = await this.db.update(leads).set(updates).where(eq(leads.id, id)).returning();
    return updated;
  }

  /** Claim an unassigned lead (or reassign, for managers). */
  async assign(tenantId: string, id: string, assignedTo: string | null, actor: Actor) {
    const lead = await this.findById(tenantId, id, actor);
    const claimingSelf = assignedTo === actor.userId;
    if (!actor.canAssign) {
      // Non-managers may only claim an unassigned lead for themselves.
      if (!claimingSelf) throw new ForbiddenException('You can only assign leads to yourself');
      if (lead.assignedTo && lead.assignedTo !== actor.userId) {
        throw new ForbiddenException('This lead is already owned by another rep');
      }
    }
    const [updated] = await this.db
      .update(leads)
      .set({ assignedTo, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  /**
   * Log a call outcome against a lead. Records the call in the activity
   * timeline and advances the lead: stamps lastContactedAt, bumps attempts,
   * sets the follow-up, and auto-transitions status by disposition.
   */
  async logCall(tenantId: string, id: string, dto: LogCallDto, actor: Actor) {
    const lead = await this.findById(tenantId, id, actor);
    const disposition = dto.disposition as Disposition;

    if (lead.status === 'converted') {
      throw new BadRequestException('This lead is already converted — no further calls can be logged');
    }
    if (!lead.phone) {
      throw new BadRequestException('Add a phone number to this lead before logging a call');
    }
    if (disposition === 'callback') {
      if (!dto.nextFollowUpAt) throw new BadRequestException('A callback needs a follow-up date/time');
      if (new Date(dto.nextFollowUpAt).getTime() <= Date.now()) {
        throw new BadRequestException('The follow-up time must be in the future');
      }
    }
    if (TERMINAL.includes(disposition) && !dto.notes?.trim()) {
      throw new BadRequestException('Please note the reason when marking a lead not interested / do-not-call');
    }

    // Derive next status from the disposition (explicit override wins).
    let nextStatus: LeadStatus = lead.status as LeadStatus;
    if (dto.status) nextStatus = dto.status as LeadStatus;
    else if (disposition === 'interested') nextStatus = 'qualified';
    else if (disposition === 'not_interested' || disposition === 'do_not_call') nextStatus = 'lost';
    else if (lead.status === 'new') nextStatus = 'contacted';

    const now = new Date();
    const followUp = dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null;

    const updated = await this.db.transaction(async (tx) => {
      await tx.insert(activities).values({
        tenantId,
        type: 'call',
        subject: `Call — ${disposition.replace(/_/g, ' ')}`,
        description: dto.notes || null,
        leadId: id,
        disposition,
        direction: dto.direction || 'outbound',
        durationMinutes: dto.durationMinutes ?? null,
        assignedTo: actor.userId,
        status: 'completed',
        completedAt: now,
        dueDate: followUp,
      });

      const [row] = await tx
        .update(leads)
        .set({
          lastContactedAt: now,
          lastDisposition: disposition,
          callAttempts: (lead.callAttempts ?? 0) + 1,
          status: nextStatus,
          // Terminal outcomes clear any pending follow-up.
          nextFollowUpAt: nextStatus === 'lost' ? null : followUp ?? lead.nextFollowUpAt,
          lostReason: nextStatus === 'lost' ? dto.notes || lead.lostReason : lead.lostReason,
          updatedAt: now,
        })
        .where(eq(leads.id, id))
        .returning();
      return row;
    });

    return updated;
  }

  async convertToContact(tenantId: string, id: string, dto: ConvertLeadDto, actor: Actor) {
    const lead = await this.findById(tenantId, id, actor);

    if (lead.status === 'converted') {
      throw new BadRequestException('Lead is already converted');
    }

    const contactSourceMap: Record<string, 'website' | 'referral' | 'cold_call' | 'trade_show' | 'social_media' | 'other'> = {
      website: 'website', referral: 'referral', social_media: 'social_media',
      cold_call: 'cold_call', trade_show: 'trade_show', email_campaign: 'other',
      advertisement: 'other', other: 'other',
    };
    const mappedSource = contactSourceMap[lead.source] || 'other';

    const result = await this.db.transaction(async (tx) => {
      const [contact] = await tx
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
        lastDisposition: 'converted',
        convertedContactId: contact.id,
        convertedAt: new Date(),
        nextFollowUpAt: null,
        updatedAt: new Date(),
      };

      let dealId: string | null = null;
      if (dto.createDeal) {
        const [stage] = await tx.select().from(dealStages).where(eq(dealStages.tenantId, tenantId)).limit(1);
        if (stage) {
          const [deal] = await tx
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

      await tx.update(leads).set(updates).where(eq(leads.id, id));
      return { leadId: id, contactId: contact.id, dealId, status: 'converted' as const };
    });

    return result;
  }

  async softDelete(tenantId: string, id: string, actor: Actor) {
    await this.findById(tenantId, id, actor);
    await this.db.update(leads).set({ deletedAt: new Date() }).where(eq(leads.id, id));
  }
}
