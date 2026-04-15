import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  tickets,
  ticketComments,
  slaPolicies,
} from '../../../database/schema/index.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto, CreateTicketCommentDto } from './dto/update-ticket.dto.js';

@Injectable()
export class TicketService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      priority?: string;
      assignedTo?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(tickets.tenantId, tenantId),
      isNull(tickets.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(tickets.status, options.status as 'open' | 'replied' | 'resolved' | 'closed'),
      );
    }

    if (options?.priority) {
      conditions.push(
        eq(tickets.priority, options.priority as 'low' | 'medium' | 'high' | 'urgent'),
      );
    }

    if (options?.assignedTo) {
      conditions.push(eq(tickets.assignedTo, options.assignedTo));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(tickets.subject, searchTerm));
    }

    const result = await this.db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(desc(tickets.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.id, id),
          eq(tickets.tenantId, tenantId),
          isNull(tickets.deletedAt),
        ),
      )
      .limit(1);

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${id}" not found`);
    }

    const comments = await this.db
      .select()
      .from(ticketComments)
      .where(
        and(
          eq(ticketComments.ticketId, id),
          isNull(ticketComments.deletedAt),
        ),
      )
      .orderBy(desc(ticketComments.createdAt));

    return { ...ticket, comments };
  }

  async create(tenantId: string, data: CreateTicketDto) {
    const ticketNumber = await this.generateTicketNumber(tenantId);
    const priority = (data.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium';

    // Look up an SLA policy for tenant+priority; fallback to first active policy
    const [slaByPriority] = await this.db
      .select()
      .from(slaPolicies)
      .where(
        and(
          eq(slaPolicies.tenantId, tenantId),
          eq(slaPolicies.priority, priority),
          eq(slaPolicies.isActive, true),
          isNull(slaPolicies.deletedAt),
        ),
      )
      .limit(1);

    let sla = slaByPriority;
    if (!sla) {
      const [fallback] = await this.db
        .select()
        .from(slaPolicies)
        .where(
          and(
            eq(slaPolicies.tenantId, tenantId),
            eq(slaPolicies.isActive, true),
            isNull(slaPolicies.deletedAt),
          ),
        )
        .limit(1);
      sla = fallback;
    }

    const now = new Date();
    const firstResponseDueAt = sla
      ? new Date(now.getTime() + sla.firstResponseHours * 3600 * 1000)
      : null;
    const resolutionDueAt = sla
      ? new Date(now.getTime() + sla.resolutionHours * 3600 * 1000)
      : null;

    const [ticket] = await this.db
      .insert(tickets)
      .values({
        tenantId,
        ticketNumber,
        subject: data.subject,
        description: data.description || null,
        priority,
        category: data.category || null,
        subCategory: data.subCategory || null,
        contactName: data.contactName || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        assignedTo: data.assignedTo || null,
        assignedGroup: data.assignedGroup || null,
        source: (data.source as 'email' | 'phone' | 'web' | 'chat') || 'web',
        status: 'open',
        slaId: sla?.id || null,
        firstResponseDueAt,
        resolutionDueAt,
      })
      .returning();

    return ticket;
  }

  async update(tenantId: string, id: string, data: UpdateTicketDto) {
    const existing = await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.subCategory !== undefined) updateData.subCategory = data.subCategory;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.assignedGroup !== undefined) updateData.assignedGroup = data.assignedGroup;
    if (data.resolution !== undefined) updateData.resolution = data.resolution;
    if (data.satisfactionRating !== undefined) updateData.satisfactionRating = data.satisfactionRating;

    if (data.status === 'resolved' && !existing.resolutionTime) {
      updateData.resolutionTime = new Date();
    }

    const [updated] = await this.db
      .update(tickets)
      .set(updateData)
      .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async addComment(tenantId: string, ticketId: string, data: CreateTicketCommentDto) {
    // Ensure ticket exists
    const ticket = await this.findById(tenantId, ticketId);

    // Set first response time if this is the first reply
    if (!ticket.firstResponseTime) {
      await this.db
        .update(tickets)
        .set({ firstResponseTime: new Date(), updatedAt: new Date() })
        .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));
    }

    const [comment] = await this.db
      .insert(ticketComments)
      .values({
        tenantId,
        ticketId,
        content: data.content,
        isInternal: data.isInternal || false,
        attachments: data.attachments || null,
      })
      .returning();

    // Update ticket status to replied if it was open
    if (ticket.status === 'open') {
      await this.db
        .update(tickets)
        .set({ status: 'replied', updatedAt: new Date() })
        .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));
    }

    return comment;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'open' | 'replied' | 'resolved' | 'closed',
  ) {
    const ticket = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      open: ['replied', 'resolved', 'closed'],
      replied: ['open', 'resolved', 'closed'],
      resolved: ['open', 'closed'],
      closed: ['open'],
    };

    const allowed = validTransitions[ticket.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${ticket.status}" to "${newStatus}"`,
      );
    }

    const updateData: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };

    if (newStatus === 'resolved' && !ticket.resolutionTime) {
      updateData.resolutionTime = new Date();
    }

    const [updated] = await this.db
      .update(tickets)
      .set(updateData)
      .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(tickets)
      .set({ deletedAt: new Date() })
      .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  private async generateTicketNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TKT-${year}-`;

    const [latest] = await this.db
      .select({ ticketNumber: tickets.ticketNumber })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          like(tickets.ticketNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${tickets.ticketNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.ticketNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
