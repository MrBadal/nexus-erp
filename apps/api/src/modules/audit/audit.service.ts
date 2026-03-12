import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { auditLog, users } from '../../database/schema/index.js';

@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      entityType?: string;
      entityId?: string;
      userId?: string;
      action?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [eq(auditLog.tenantId, tenantId)];

    if (options?.entityType) {
      conditions.push(eq(auditLog.entityType, options.entityType));
    }
    if (options?.entityId) {
      conditions.push(eq(auditLog.entityId, options.entityId));
    }
    if (options?.userId) {
      conditions.push(eq(auditLog.userId, options.userId));
    }
    if (options?.action) {
      conditions.push(eq(auditLog.action, options.action as any));
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const results = await this.db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        changes: auditLog.changes,
        metadata: auditLog.metadata,
        createdAt: auditLog.createdAt,
        userId: auditLog.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  }

  async logAction(data: {
    tenantId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    changes?: any;
    metadata?: any;
  }) {
    const [entry] = await this.db
      .insert(auditLog)
      .values({
        tenantId: data.tenantId,
        userId: data.userId,
        action: data.action as any,
        entityType: data.entityType,
        entityId: data.entityId || null,
        changes: data.changes || null,
        metadata: data.metadata || null,
      })
      .returning();

    return entry;
  }
}
