import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  and,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { employees } from '../../../database/schema/index.js';
import {
  announcements,
  announcementReads,
  type NewAnnouncement,
  type NewAnnouncementRead,
} from '../../../database/schema/hr-announcements.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';

@Injectable()
export class AnnouncementService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ─── HR-side ────────────────────────────────────────────

  async findAll(
    tenantId: string,
    options?: { search?: string; limit?: number; offset?: number },
  ) {
    const conditions = [
      eq(announcements.tenantId, tenantId),
      isNull(announcements.deletedAt),
    ];

    if (options?.search) {
      const term = `%${options.search}%`;
      conditions.push(
        or(
          ilike(announcements.title, term),
          ilike(announcements.body, term),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(announcements)
      .where(and(...conditions))
      .orderBy(desc(announcements.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);

    // Attach read counts in a single query
    const ids = rows.map((r) => r.id);
    const readCounts = ids.length
      ? await this.db
          .select({
            announcementId: announcementReads.announcementId,
            count: sql<number>`count(*)::int`.as('count'),
          })
          .from(announcementReads)
          .where(inArray(announcementReads.announcementId, ids))
          .groupBy(announcementReads.announcementId)
      : [];

    const readMap = new Map(readCounts.map((r) => [r.announcementId, Number(r.count)]));

    return rows.map((row) => {
      const now = new Date();
      const isPublished = row.publishedAt !== null && row.publishedAt <= now;
      const isExpired = row.expiresAt !== null && row.expiresAt <= now;
      const status: 'draft' | 'scheduled' | 'published' | 'expired' = !row.publishedAt
        ? 'draft'
        : !isPublished
          ? 'scheduled'
          : isExpired
            ? 'expired'
            : 'published';
      return {
        ...row,
        readCount: readMap.get(row.id) ?? 0,
        status,
      };
    });
  }

  async findById(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.id, id),
          eq(announcements.tenantId, tenantId),
          isNull(announcements.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Announcement with ID "${id}" not found`);
    }

    const [{ count } = { count: 0 }] = await this.db
      .select({ count: sql<number>`count(*)::int`.as('count') })
      .from(announcementReads)
      .where(eq(announcementReads.announcementId, id));

    return { ...row, readCount: Number(count ?? 0) };
  }

  async create(tenantId: string, createdBy: string, data: CreateAnnouncementDto) {
    this.validateAudience(data.audienceScope, data.audienceIds);

    const values: NewAnnouncement = {
      tenantId,
      title: data.title,
      body: data.body,
      audienceScope: data.audienceScope,
      audienceIds: this.normalizeAudienceIds(data.audienceScope, data.audienceIds),
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdBy,
    };

    const [row] = await this.db.insert(announcements).values(values).returning();
    return row;
  }

  async update(tenantId: string, id: string, data: UpdateAnnouncementDto) {
    const existing = await this.findById(tenantId, id);

    const audienceScope = data.audienceScope ?? existing.audienceScope;
    const audienceIds =
      data.audienceIds !== undefined
        ? data.audienceIds
        : (existing.audienceIds as string[] | null) ?? undefined;

    if (data.audienceScope !== undefined || data.audienceIds !== undefined) {
      this.validateAudience(audienceScope, audienceIds ?? undefined);
    }

    const patch: Partial<NewAnnouncement> = {
      updatedAt: new Date(),
    };
    if (data.title !== undefined) patch.title = data.title;
    if (data.body !== undefined) patch.body = data.body;
    if (data.audienceScope !== undefined) patch.audienceScope = data.audienceScope;
    if (data.audienceIds !== undefined) {
      patch.audienceIds = this.normalizeAudienceIds(audienceScope, data.audienceIds);
    }
    if (data.publishedAt !== undefined) {
      patch.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    }
    if (data.expiresAt !== undefined) {
      patch.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    const [row] = await this.db
      .update(announcements)
      .set(patch)
      .where(
        and(
          eq(announcements.id, id),
          eq(announcements.tenantId, tenantId),
          isNull(announcements.deletedAt),
        ),
      )
      .returning();

    return row;
  }

  async publish(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);
    if (existing.publishedAt && existing.publishedAt <= new Date()) {
      throw new BadRequestException('Announcement is already published');
    }

    const [row] = await this.db
      .update(announcements)
      .set({ publishedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(announcements.id, id),
          eq(announcements.tenantId, tenantId),
          isNull(announcements.deletedAt),
        ),
      )
      .returning();

    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db
      .update(announcements)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(announcements.id, id),
          eq(announcements.tenantId, tenantId),
        ),
      );
    return { success: true };
  }

  // ─── ESS-side ───────────────────────────────────────────

  /**
   * Returns announcements visible to the given employee:
   *   - tenant matches
   *   - publishedAt <= now (skipped drafts/scheduled)
   *   - expiresAt is null or > now
   *   - audienceScope matches:
   *       'tenant'       -> visible to all
   *       'department'   -> employee.departmentId in audienceIds
   *       'designation'  -> employee.designationId in audienceIds
   *       'specific'     -> employee.id in audienceIds
   * Each row carries a `read` boolean indicating whether this employee has read it.
   */
  async findFeed(tenantId: string, employeeId: string) {
    const [employee] = await this.db
      .select({
        id: employees.id,
        departmentId: employees.departmentId,
        designationId: employees.designationId,
      })
      .from(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.tenantId, tenantId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const now = new Date();

    // SQL-side audience scope filter via OR-tree across the four scopes.
    const tenantScope = eq(announcements.audienceScope, 'tenant');
    const deptScope = employee.departmentId
      ? and(
          eq(announcements.audienceScope, 'department'),
          sql`${announcements.audienceIds} @> ARRAY[${employee.departmentId}]::uuid[]`,
        )
      : sql`false`;
    const desigScope = employee.designationId
      ? and(
          eq(announcements.audienceScope, 'designation'),
          sql`${announcements.audienceIds} @> ARRAY[${employee.designationId}]::uuid[]`,
        )
      : sql`false`;
    const specificScope = and(
      eq(announcements.audienceScope, 'specific'),
      sql`${announcements.audienceIds} @> ARRAY[${employee.id}]::uuid[]`,
    );

    const rows = await this.db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.tenantId, tenantId),
          isNull(announcements.deletedAt),
          lte(announcements.publishedAt, now),
          or(
            isNull(announcements.expiresAt),
            gt(announcements.expiresAt, now),
          ),
          or(tenantScope, deptScope, desigScope, specificScope)!,
        ),
      )
      .orderBy(desc(announcements.publishedAt));

    if (rows.length === 0) return [];

    const reads = await this.db
      .select({ announcementId: announcementReads.announcementId })
      .from(announcementReads)
      .where(
        and(
          eq(announcementReads.employeeId, employeeId),
          inArray(
            announcementReads.announcementId,
            rows.map((r) => r.id),
          ),
        ),
      );
    const readSet = new Set(reads.map((r) => r.announcementId));

    return rows.map((row) => ({
      ...row,
      read: readSet.has(row.id),
    }));
  }

  async markRead(tenantId: string, announcementId: string, employeeId: string) {
    // Validate the announcement exists & is in the same tenant
    const [ann] = await this.db
      .select({ id: announcements.id })
      .from(announcements)
      .where(
        and(
          eq(announcements.id, announcementId),
          eq(announcements.tenantId, tenantId),
          isNull(announcements.deletedAt),
        ),
      )
      .limit(1);
    if (!ann) throw new NotFoundException('Announcement not found');

    const values: NewAnnouncementRead = {
      announcementId,
      employeeId,
    };

    // Upsert: ignore conflicts on (announcement_id, employee_id)
    await this.db
      .insert(announcementReads)
      .values(values)
      .onConflictDoNothing({
        target: [announcementReads.announcementId, announcementReads.employeeId],
      });

    return { success: true };
  }

  async getUnreadCount(tenantId: string, employeeId: string) {
    const feed = await this.findFeed(tenantId, employeeId);
    return { count: feed.filter((a) => !a.read).length };
  }

  // ─── Helpers ────────────────────────────────────────────

  private validateAudience(scope: string, ids: string[] | undefined | null) {
    if (scope === 'tenant') return;
    if (!ids || ids.length === 0) {
      throw new BadRequestException(
        `audienceIds are required when audienceScope is "${scope}"`,
      );
    }
  }

  private normalizeAudienceIds(
    scope: string,
    ids: string[] | undefined | null,
  ): string[] | null {
    if (scope === 'tenant') return null;
    return ids && ids.length ? ids : null;
  }
}
