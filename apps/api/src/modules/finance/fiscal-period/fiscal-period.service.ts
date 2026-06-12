import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { fiscalPeriods } from '../../../database/schema/index.js';

@Injectable()
export class FiscalPeriodService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string) {
    return this.db
      .select()
      .from(fiscalPeriods)
      .where(eq(fiscalPeriods.tenantId, tenantId))
      .orderBy(desc(fiscalPeriods.startDate));
  }

  async findById(tenantId: string, id: string) {
    const [period] = await this.db
      .select()
      .from(fiscalPeriods)
      .where(
        and(eq(fiscalPeriods.id, id), eq(fiscalPeriods.tenantId, tenantId)),
      )
      .limit(1);

    if (!period) {
      throw new NotFoundException(`Fiscal period "${id}" not found`);
    }
    return period;
  }

  async create(
    tenantId: string,
    data: { name: string; type: 'month' | 'quarter' | 'year'; startDate: string; endDate: string },
  ) {
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    const [created] = await this.db
      .insert(fiscalPeriods)
      .values({
        tenantId,
        name: data.name,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
      })
      .returning();

    return created;
  }

  async close(tenantId: string, id: string, userId: string) {
    const period = await this.findById(tenantId, id);

    if (period.status === 'closed' || period.status === 'locked') {
      throw new BadRequestException(`Period is already ${period.status}`);
    }

    const [updated] = await this.db
      .update(fiscalPeriods)
      .set({
        status: 'closed',
        closedBy: userId,
        closedAt: new Date(),
      })
      .where(and(eq(fiscalPeriods.id, id), eq(fiscalPeriods.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async reopen(tenantId: string, id: string) {
    const period = await this.findById(tenantId, id);

    if (period.status === 'locked') {
      throw new BadRequestException('Cannot reopen a locked period');
    }

    if (period.status === 'open') {
      throw new BadRequestException('Period is already open');
    }

    const [updated] = await this.db
      .update(fiscalPeriods)
      .set({ status: 'open', closedBy: null, closedAt: null })
      .where(and(eq(fiscalPeriods.id, id), eq(fiscalPeriods.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async lock(tenantId: string, id: string) {
    const period = await this.findById(tenantId, id);

    if (period.status !== 'closed') {
      throw new BadRequestException('Only closed periods can be locked');
    }

    const [updated] = await this.db
      .update(fiscalPeriods)
      .set({ status: 'locked' })
      .where(and(eq(fiscalPeriods.id, id), eq(fiscalPeriods.tenantId, tenantId)))
      .returning();

    return updated;
  }
}
