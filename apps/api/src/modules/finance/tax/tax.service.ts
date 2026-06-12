import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { taxRates } from '../../../database/schema/index.js';

@Injectable()
export class TaxService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string) {
    return this.db
      .select()
      .from(taxRates)
      .where(eq(taxRates.tenantId, tenantId))
      .orderBy(taxRates.name);
  }

  async findById(tenantId: string, id: string) {
    const [tax] = await this.db
      .select()
      .from(taxRates)
      .where(and(eq(taxRates.id, id), eq(taxRates.tenantId, tenantId)))
      .limit(1);

    if (!tax) {
      throw new NotFoundException(`Tax rate "${id}" not found`);
    }
    return tax;
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      code: string;
      rate: string;
      type?: 'percentage' | 'fixed';
      scope?: 'sales' | 'purchase' | 'both';
      isCompound?: boolean;
      isInclusive?: boolean;
      accountId?: string;
      reportingCode?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
    },
  ) {
    const [existing] = await this.db
      .select()
      .from(taxRates)
      .where(and(eq(taxRates.tenantId, tenantId), eq(taxRates.code, data.code)))
      .limit(1);

    if (existing) {
      throw new ConflictException(`Tax code "${data.code}" already exists`);
    }

    const [created] = await this.db
      .insert(taxRates)
      .values({
        tenantId,
        name: data.name,
        code: data.code,
        rate: data.rate,
        type: data.type || 'percentage',
        scope: data.scope || 'both',
        isCompound: data.isCompound ?? false,
        isInclusive: data.isInclusive ?? false,
        accountId: data.accountId || null,
        reportingCode: data.reportingCode || null,
        effectiveFrom: data.effectiveFrom || null,
        effectiveTo: data.effectiveTo || null,
      })
      .returning();

    return created;
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      rate?: string;
      scope?: 'sales' | 'purchase' | 'both';
      isCompound?: boolean;
      isInclusive?: boolean;
      accountId?: string;
      reportingCode?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
      isActive?: boolean;
    },
  ) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(taxRates)
      .set(data)
      .where(and(eq(taxRates.id, id), eq(taxRates.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async deactivate(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(taxRates)
      .set({ isActive: false })
      .where(and(eq(taxRates.id, id), eq(taxRates.tenantId, tenantId)))
      .returning();

    return updated;
  }
}
