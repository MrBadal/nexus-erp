import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  holidays,
  type Holiday,
  type NewHoliday,
} from '../../../database/schema/hr-holidays.js';
import { CreateHolidayDto } from './dto/create-holiday.dto.js';
import { UpdateHolidayDto } from './dto/update-holiday.dto.js';

@Injectable()
export class HolidayService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  private deriveYear(dateStr: string, fallback?: number): number {
    if (fallback && Number.isFinite(fallback)) return fallback;
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().getFullYear();
    }
    return parsed.getUTCFullYear();
  }

  async create(tenantId: string, data: CreateHolidayDto): Promise<Holiday> {
    const year = this.deriveYear(data.date, data.year);

    const values: NewHoliday = {
      tenantId,
      date: data.date,
      name: data.name,
      type: data.type ?? 'company',
      regions: data.regions ?? null,
      isRecurring: data.isRecurring ?? false,
      year,
      notes: data.notes ?? null,
    };

    const [holiday] = await this.db.insert(holidays).values(values).returning();
    return holiday;
  }

  async findAll(tenantId: string): Promise<Holiday[]> {
    return this.db
      .select()
      .from(holidays)
      .where(and(eq(holidays.tenantId, tenantId), isNull(holidays.deletedAt)))
      .orderBy(asc(holidays.date));
  }

  async listForYear(tenantId: string, year: number): Promise<Holiday[]> {
    return this.db
      .select()
      .from(holidays)
      .where(
        and(
          eq(holidays.tenantId, tenantId),
          eq(holidays.year, year),
          isNull(holidays.deletedAt),
        ),
      )
      .orderBy(asc(holidays.date));
  }

  async findById(tenantId: string, id: string): Promise<Holiday> {
    const [row] = await this.db
      .select()
      .from(holidays)
      .where(
        and(
          eq(holidays.id, id),
          eq(holidays.tenantId, tenantId),
          isNull(holidays.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Holiday ${id} not found`);
    }
    return row;
  }

  async update(
    tenantId: string,
    id: string,
    data: UpdateHolidayDto,
  ): Promise<Holiday> {
    await this.findById(tenantId, id);

    const patch: Partial<NewHoliday> = { updatedAt: new Date() };
    if (data.date !== undefined) patch.date = data.date;
    if (data.name !== undefined) patch.name = data.name;
    if (data.type !== undefined) patch.type = data.type;
    if (data.regions !== undefined) patch.regions = data.regions;
    if (data.isRecurring !== undefined) patch.isRecurring = data.isRecurring;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.year !== undefined) {
      patch.year = data.year;
    } else if (data.date !== undefined) {
      patch.year = this.deriveYear(data.date);
    }

    const [updated] = await this.db
      .update(holidays)
      .set(patch)
      .where(and(eq(holidays.id, id), eq(holidays.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async remove(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findById(tenantId, id);

    await this.db
      .update(holidays)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(holidays.id, id), eq(holidays.tenantId, tenantId)));

    return { success: true };
  }
}
