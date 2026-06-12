import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { retentionPolicies, legalHolds } from '../../database/schema/index.js';

@Injectable()
export class RetentionService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ─── Retention Policies ────────────────────────────────

  async findAllPolicies(tenantId: string) {
    return this.db
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.tenantId, tenantId))
      .orderBy(desc(retentionPolicies.createdAt));
  }

  async createPolicy(tenantId: string, dto: {
    documentType: string;
    retentionDays: number;
    autoArchive?: boolean;
  }) {
    const [policy] = await this.db.insert(retentionPolicies).values({
      tenantId,
      documentType: dto.documentType,
      retentionDays: dto.retentionDays,
      autoArchive: dto.autoArchive ?? false,
    }).returning();
    return policy;
  }

  async updatePolicy(tenantId: string, id: string, dto: {
    retentionDays?: number;
    autoArchive?: boolean;
    isActive?: boolean;
  }) {
    const [existing] = await this.db.select().from(retentionPolicies)
      .where(and(eq(retentionPolicies.id, id), eq(retentionPolicies.tenantId, tenantId)))
      .limit(1);
    if (!existing) throw new NotFoundException('Retention policy not found');

    const [updated] = await this.db.update(retentionPolicies)
      .set({
        ...(dto.retentionDays !== undefined && { retentionDays: dto.retentionDays }),
        ...(dto.autoArchive !== undefined && { autoArchive: dto.autoArchive }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(retentionPolicies.id, id), eq(retentionPolicies.tenantId, tenantId)))
      .returning();
    return updated;
  }

  // ─── Legal Holds ──────────────────────────────────────

  async findLegalHolds(tenantId: string, documentType?: string, documentId?: string) {
    const conditions = [eq(legalHolds.tenantId, tenantId)];
    if (documentType) conditions.push(eq(legalHolds.documentType, documentType));
    if (documentId) conditions.push(eq(legalHolds.documentId, documentId));

    return this.db.select().from(legalHolds)
      .where(and(...conditions))
      .orderBy(desc(legalHolds.heldAt));
  }

  async placeLegalHold(tenantId: string, dto: {
    documentType: string;
    documentId: string;
    reason: string;
    heldBy?: string;
  }) {
    const [hold] = await this.db.insert(legalHolds).values({
      tenantId,
      documentType: dto.documentType,
      documentId: dto.documentId,
      reason: dto.reason,
      heldBy: dto.heldBy || null,
    }).returning();
    return hold;
  }

  async releaseLegalHold(tenantId: string, id: string, userId: string) {
    const [existing] = await this.db.select().from(legalHolds)
      .where(and(eq(legalHolds.id, id), eq(legalHolds.tenantId, tenantId)))
      .limit(1);
    if (!existing) throw new NotFoundException('Legal hold not found');

    const [updated] = await this.db.update(legalHolds)
      .set({
        releasedAt: new Date(),
        releasedBy: userId,
      })
      .where(and(eq(legalHolds.id, id), eq(legalHolds.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async isUnderLegalHold(tenantId: string, documentType: string, documentId: string): Promise<boolean> {
    const [hold] = await this.db.select().from(legalHolds)
      .where(and(
        eq(legalHolds.tenantId, tenantId),
        eq(legalHolds.documentType, documentType),
        eq(legalHolds.documentId, documentId),
        isNull(legalHolds.releasedAt),
      ))
      .limit(1);
    return !!hold;
  }
}
