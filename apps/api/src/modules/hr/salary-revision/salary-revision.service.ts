import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  salaryRevisions,
  type SalaryRevision,
  type NewSalaryRevision,
} from '../../../database/schema/hr-lifecycle.js';
import { CreateSalaryRevisionDto } from './dto/create-salary-revision.dto.js';
import { UpdateSalaryRevisionDto } from './dto/update-salary-revision.dto.js';

interface FindAllOptions {
  employeeId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class SalaryRevisionService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  private computePercent(
    previousCtc: string | null | undefined,
    newCtc: string | null | undefined,
    explicit?: string,
  ): string | null {
    if (explicit !== undefined && explicit !== null && explicit !== '') {
      return explicit;
    }
    if (
      previousCtc === undefined ||
      previousCtc === null ||
      previousCtc === '' ||
      newCtc === undefined ||
      newCtc === null ||
      newCtc === ''
    ) {
      return null;
    }
    const prev = Number(previousCtc);
    const next = Number(newCtc);
    if (!Number.isFinite(prev) || !Number.isFinite(next) || prev === 0) {
      return null;
    }
    return (((next - prev) / prev) * 100).toFixed(2);
  }

  async create(
    tenantId: string,
    data: CreateSalaryRevisionDto,
  ): Promise<SalaryRevision> {
    const values: NewSalaryRevision = {
      tenantId,
      employeeId: data.employeeId,
      effectiveDate: data.effectiveDate,
      previousCtc: data.previousCtc ?? null,
      newCtc: data.newCtc,
      revisionPercent: this.computePercent(
        data.previousCtc,
        data.newCtc,
        data.revisionPercent,
      ),
      reason: data.reason ?? null,
      approvedBy: data.approvedBy ?? null,
    };

    const [revision] = await this.db
      .insert(salaryRevisions)
      .values(values)
      .returning();
    return revision;
  }

  async findAll(
    tenantId: string,
    options: FindAllOptions = {},
  ): Promise<SalaryRevision[]> {
    const conditions = [
      eq(salaryRevisions.tenantId, tenantId),
      isNull(salaryRevisions.deletedAt),
    ];
    if (options.employeeId) {
      conditions.push(eq(salaryRevisions.employeeId, options.employeeId));
    }

    return this.db
      .select()
      .from(salaryRevisions)
      .where(and(...conditions))
      .orderBy(desc(salaryRevisions.effectiveDate))
      .limit(options.limit ?? 100)
      .offset(options.offset ?? 0);
  }

  async findById(tenantId: string, id: string): Promise<SalaryRevision> {
    const [row] = await this.db
      .select()
      .from(salaryRevisions)
      .where(
        and(
          eq(salaryRevisions.id, id),
          eq(salaryRevisions.tenantId, tenantId),
          isNull(salaryRevisions.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Salary revision ${id} not found`);
    }
    return row;
  }

  async update(
    tenantId: string,
    id: string,
    data: UpdateSalaryRevisionDto,
  ): Promise<SalaryRevision> {
    const existing = await this.findById(tenantId, id);

    const patch: Partial<NewSalaryRevision> = { updatedAt: new Date() };
    if (data.employeeId !== undefined) patch.employeeId = data.employeeId;
    if (data.effectiveDate !== undefined) patch.effectiveDate = data.effectiveDate;
    if (data.previousCtc !== undefined) patch.previousCtc = data.previousCtc;
    if (data.newCtc !== undefined) patch.newCtc = data.newCtc;
    if (data.reason !== undefined) patch.reason = data.reason;
    if (data.approvedBy !== undefined) patch.approvedBy = data.approvedBy;

    if (data.revisionPercent !== undefined) {
      patch.revisionPercent = data.revisionPercent;
    } else if (data.previousCtc !== undefined || data.newCtc !== undefined) {
      patch.revisionPercent = this.computePercent(
        data.previousCtc ?? existing.previousCtc,
        data.newCtc ?? existing.newCtc,
      );
    }

    const [updated] = await this.db
      .update(salaryRevisions)
      .set(patch)
      .where(
        and(
          eq(salaryRevisions.id, id),
          eq(salaryRevisions.tenantId, tenantId),
        ),
      )
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findById(tenantId, id);

    await this.db
      .update(salaryRevisions)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(salaryRevisions.id, id),
          eq(salaryRevisions.tenantId, tenantId),
        ),
      );

    return { success: true };
  }
}
