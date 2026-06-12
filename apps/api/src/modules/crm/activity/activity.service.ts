import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  activities,
  contacts,
  deals,
  type Activity,
  type NewActivity,
} from '../../../database/schema/index.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';

interface ActivityListOptions {
  type?: string;
  status?: string;
  priority?: string;
  contactId?: string;
  dealId?: string;
  assignedTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

@Injectable()
export class ActivityService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string, options?: ActivityListOptions) {
    const conditions: ReturnType<typeof eq>[] = [
      eq(activities.tenantId, tenantId),
      isNull(activities.deletedAt),
    ];

    if (options?.type) {
      conditions.push(eq(activities.type, options.type as NewActivity['type']));
    }

    if (options?.status) {
      conditions.push(eq(activities.status, options.status as Activity['status']));
    }

    if (options?.priority) {
      conditions.push(eq(activities.priority, options.priority as Activity['priority']));
    }

    if (options?.contactId) {
      conditions.push(eq(activities.contactId, options.contactId));
    }

    if (options?.dealId) {
      conditions.push(eq(activities.dealId, options.dealId));
    }

    if (options?.assignedTo) {
      conditions.push(eq(activities.assignedTo, options.assignedTo));
    }

    const whereClause = and(...conditions);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(activities)
      .where(whereClause);

    const sortColumn = options?.sortBy === 'due_date' ? activities.dueDate
      : options?.sortBy === 'priority' ? activities.priority
      : options?.sortBy === 'type' ? activities.type
      : activities.createdAt;

    const orderFn = options?.sortOrder === 'asc' ? asc : desc;

    const data = await this.db
      .select()
      .from(activities)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return { data, total: countResult.count };
  }

  async findById(tenantId: string, id: string) {
    const [activity] = await this.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.id, id),
          eq(activities.tenantId, tenantId),
          isNull(activities.deletedAt),
        ),
      )
      .limit(1);

    if (!activity) {
      throw new NotFoundException(`Activity with ID "${id}" not found`);
    }

    return activity;
  }

  async create(tenantId: string, data: CreateActivityDto) {
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

    // Validate deal if provided
    if (data.dealId) {
      const [deal] = await this.db
        .select()
        .from(deals)
        .where(
          and(
            eq(deals.id, data.dealId),
            eq(deals.tenantId, tenantId),
            isNull(deals.deletedAt),
          ),
        )
        .limit(1);

      if (!deal) {
        throw new BadRequestException(`Deal with ID "${data.dealId}" not found`);
      }
    }

    const [activity] = await this.db
      .insert(activities)
      .values({
        tenantId,
        type: data.type as NewActivity['type'],
        subject: data.subject,
        description: data.description || null,
        contactId: data.contactId || null,
        dealId: data.dealId || null,
        assignedTo: data.assignedTo || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: (data.status as NewActivity['status']) || 'pending',
        priority: (data.priority as NewActivity['priority']) || 'medium',
      })
      .returning();

    return activity;
  }

  async update(tenantId: string, id: string, data: UpdateActivityDto) {
    await this.findById(tenantId, id);

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

    // Validate deal if provided
    if (data.dealId) {
      const [deal] = await this.db
        .select()
        .from(deals)
        .where(
          and(
            eq(deals.id, data.dealId),
            eq(deals.tenantId, tenantId),
            isNull(deals.deletedAt),
          ),
        )
        .limit(1);

      if (!deal) {
        throw new BadRequestException(`Deal with ID "${data.dealId}" not found`);
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.type !== undefined) updateData.type = data.type;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.contactId !== undefined) updateData.contactId = data.contactId;
    if (data.dealId !== undefined) updateData.dealId = data.dealId;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;

    const [updated] = await this.db
      .update(activities)
      .set(updateData)
      .where(and(eq(activities.id, id), eq(activities.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async complete(tenantId: string, id: string) {
    const activity = await this.findById(tenantId, id);

    if (activity.status === 'completed') {
      throw new BadRequestException('Activity is already completed');
    }

    if (activity.status === 'cancelled') {
      throw new BadRequestException('Cannot complete a cancelled activity');
    }

    const [updated] = await this.db
      .update(activities)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, id), eq(activities.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.db
      .update(activities)
      .set({ deletedAt: new Date() })
      .where(and(eq(activities.id, id), eq(activities.tenantId, tenantId)));

    return { message: 'Activity deleted successfully' };
  }
}
