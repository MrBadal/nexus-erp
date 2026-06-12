import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, isNull, desc, asc, ilike, or, sql, inArray } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  contacts,
  contactGroups,
  contactGroupMembers,
  type NewContact,
  type NewContactGroup,
} from '../../../database/schema/index.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';
import { CreateContactGroupDto } from './dto/create-contact-group.dto.js';

interface ContactListOptions {
  type?: string;
  status?: string;
  source?: string;
  groupId?: string;
  search?: string;
  assignedTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

@Injectable()
export class ContactService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string, options?: ContactListOptions) {
    const conditions: ReturnType<typeof eq>[] = [
      eq(contacts.tenantId, tenantId),
      isNull(contacts.deletedAt),
    ];

    if (options?.type) {
      conditions.push(eq(contacts.type, options.type as 'customer' | 'vendor' | 'lead' | 'both'));
    }

    if (options?.status) {
      conditions.push(eq(contacts.status, options.status as 'active' | 'inactive'));
    }

    if (options?.source) {
      conditions.push(eq(contacts.source, options.source as 'website' | 'referral' | 'cold_call' | 'trade_show' | 'social_media' | 'other'));
    }

    if (options?.assignedTo) {
      conditions.push(eq(contacts.assignedTo, options.assignedTo));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(
        or(
          ilike(contacts.firstName, searchTerm),
          ilike(contacts.lastName, searchTerm),
          ilike(contacts.email, searchTerm),
          ilike(contacts.company, searchTerm),
        )!,
      );
    }

    // If filtering by group, get contact IDs in that group first
    if (options?.groupId) {
      const members = await this.db
        .select({ contactId: contactGroupMembers.contactId })
        .from(contactGroupMembers)
        .where(eq(contactGroupMembers.groupId, options.groupId));

      const contactIds = members.map((m) => m.contactId);
      if (contactIds.length === 0) {
        return { data: [], total: 0 };
      }
      conditions.push(inArray(contacts.id, contactIds));
    }

    const whereClause = and(...conditions);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(whereClause);

    const sortColumn = options?.sortBy === 'company' ? contacts.company
      : options?.sortBy === 'email' ? contacts.email
      : options?.sortBy === 'created_at' ? contacts.createdAt
      : contacts.firstName;

    const orderFn = options?.sortOrder === 'desc' ? desc : asc;

    const data = await this.db
      .select()
      .from(contacts)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return { data, total: countResult.count };
  }

  async findById(tenantId: string, id: string) {
    const [contact] = await this.db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.id, id),
          eq(contacts.tenantId, tenantId),
          isNull(contacts.deletedAt),
        ),
      )
      .limit(1);

    if (!contact) {
      throw new NotFoundException(`Contact with ID "${id}" not found`);
    }

    // Get groups for this contact
    const groups = await this.db
      .select({
        id: contactGroups.id,
        name: contactGroups.name,
      })
      .from(contactGroupMembers)
      .innerJoin(contactGroups, eq(contactGroupMembers.groupId, contactGroups.id))
      .where(eq(contactGroupMembers.contactId, id));

    return { ...contact, groups };
  }

  async create(tenantId: string, data: CreateContactDto) {
    const [contact] = await this.db
      .insert(contacts)
      .values({
        tenantId,
        type: (data.type as NewContact['type']) || 'lead',
        salutation: data.salutation || null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        company: data.company || null,
        jobTitle: data.jobTitle || null,
        website: data.website || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        postalCode: data.postalCode || null,
        source: (data.source as NewContact['source']) || null,
        status: (data.status as NewContact['status']) || 'active',
        assignedTo: data.assignedTo || null,
        tags: data.tags || null,
        notes: data.notes || null,
        imageUrl: data.imageUrl || null,
      })
      .returning();

    return contact;
  }

  async update(tenantId: string, id: string, data: UpdateContactDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.type !== undefined) updateData.type = data.type;
    if (data.salutation !== undefined) updateData.salutation = data.salutation;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

    const [updated] = await this.db
      .update(contacts)
      .set(updateData)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.db
      .update(contacts)
      .set({ deletedAt: new Date(), status: 'inactive' })
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)));

    return { message: 'Contact deleted successfully' };
  }

  // ─── Contact Groups ───────────────────────────────────

  async findAllGroups(tenantId: string) {
    return this.db
      .select()
      .from(contactGroups)
      .where(
        and(
          eq(contactGroups.tenantId, tenantId),
          isNull(contactGroups.deletedAt),
        ),
      )
      .orderBy(asc(contactGroups.name));
  }

  async createGroup(tenantId: string, data: CreateContactGroupDto) {
    // Check name uniqueness within tenant
    const [existing] = await this.db
      .select()
      .from(contactGroups)
      .where(
        and(
          eq(contactGroups.tenantId, tenantId),
          eq(contactGroups.name, data.name),
          isNull(contactGroups.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Contact group "${data.name}" already exists`);
    }

    const [group] = await this.db
      .insert(contactGroups)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
      })
      .returning();

    return group;
  }

  async addToGroup(tenantId: string, contactId: string, groupId: string) {
    // Verify contact and group exist
    await this.findById(tenantId, contactId);

    const [group] = await this.db
      .select()
      .from(contactGroups)
      .where(
        and(
          eq(contactGroups.id, groupId),
          eq(contactGroups.tenantId, tenantId),
          isNull(contactGroups.deletedAt),
        ),
      )
      .limit(1);

    if (!group) {
      throw new NotFoundException(`Contact group with ID "${groupId}" not found`);
    }

    // Check if already a member
    const [existing] = await this.db
      .select()
      .from(contactGroupMembers)
      .where(
        and(
          eq(contactGroupMembers.contactId, contactId),
          eq(contactGroupMembers.groupId, groupId),
        ),
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const [member] = await this.db
      .insert(contactGroupMembers)
      .values({ contactId, groupId })
      .returning();

    return member;
  }

  async removeFromGroup(contactId: string, groupId: string) {
    await this.db
      .delete(contactGroupMembers)
      .where(
        and(
          eq(contactGroupMembers.contactId, contactId),
          eq(contactGroupMembers.groupId, groupId),
        ),
      );

    return { message: 'Contact removed from group' };
  }
}
