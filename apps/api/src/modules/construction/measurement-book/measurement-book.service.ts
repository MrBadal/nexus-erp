import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc, like } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  measurementBooks,
  measurementBookLines,
  type MeasurementBook,
  type NewMeasurementBook,
} from '../../../database/schema/index.js';

interface CreateMbLineDto {
  boqItemId: string;
  description?: string;
  noOfItems?: string;
  length?: string;
  breadth?: string;
  height?: string;
  quantity: string;
  rate: string;
}

interface CreateMeasurementBookDto {
  contractId: string;
  measurementDate: string;
  measuredBy?: string;
  checkedBy?: string;
  notes?: string;
  lines?: CreateMbLineDto[];
}

@Injectable()
export class MeasurementBookService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: { contractId?: string; status?: string; search?: string },
  ) {
    const conditions = [eq(measurementBooks.tenantId, tenantId)];

    if (options?.contractId) {
      conditions.push(eq(measurementBooks.contractId, options.contractId));
    }

    if (options?.status) {
      conditions.push(eq(measurementBooks.status, options.status));
    }

    if (options?.search) {
      conditions.push(like(measurementBooks.mbNumber, `%${options.search}%`));
    }

    return this.db
      .select()
      .from(measurementBooks)
      .where(and(...conditions))
      .orderBy(desc(measurementBooks.createdAt));
  }

  async findById(tenantId: string, id: string) {
    const [mb] = await this.db
      .select()
      .from(measurementBooks)
      .where(
        and(
          eq(measurementBooks.id, id),
          eq(measurementBooks.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!mb) {
      throw new NotFoundException(`Measurement Book with ID "${id}" not found`);
    }

    const lines = await this.db
      .select()
      .from(measurementBookLines)
      .where(eq(measurementBookLines.mbId, id));

    return { ...mb, lines };
  }

  async create(tenantId: string, userId: string, data: CreateMeasurementBookDto) {
    const mbNumber = await this.generateMbNumber(tenantId);

    const [mb] = await this.db
      .insert(measurementBooks)
      .values({
        tenantId,
        contractId: data.contractId,
        mbNumber,
        measurementDate: data.measurementDate,
        measuredBy: data.measuredBy || null,
        checkedBy: data.checkedBy || null,
        status: 'draft',
        notes: data.notes || null,
        createdBy: userId,
      } satisfies NewMeasurementBook)
      .returning();

    if (data.lines && data.lines.length > 0) {
      await this.db.insert(measurementBookLines).values(
        data.lines.map((line) => {
          const qty = parseFloat(line.quantity);
          const rate = parseFloat(line.rate);
          return {
            mbId: mb.id,
            boqItemId: line.boqItemId,
            description: line.description || null,
            noOfItems: line.noOfItems || '1',
            length: line.length || null,
            breadth: line.breadth || null,
            height: line.height || null,
            quantity: line.quantity,
            rate: line.rate,
            amount: (qty * rate).toFixed(2),
          };
        }),
      );
    }

    return this.findById(tenantId, mb.id);
  }

  async approve(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(measurementBooks)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(and(eq(measurementBooks.id, id), eq(measurementBooks.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async addLines(tenantId: string, mbId: string, lines: CreateMbLineDto[]) {
    const [mb] = await this.db
      .select()
      .from(measurementBooks)
      .where(and(eq(measurementBooks.id, mbId), eq(measurementBooks.tenantId, tenantId)))
      .limit(1);

    if (!mb) {
      throw new NotFoundException(`Measurement Book with ID "${mbId}" not found`);
    }

    await this.db.insert(measurementBookLines).values(
      lines.map((line) => {
        const qty = parseFloat(line.quantity);
        const rate = parseFloat(line.rate);
        return {
          mbId,
          boqItemId: line.boqItemId,
          description: line.description || null,
          noOfItems: line.noOfItems || '1',
          length: line.length || null,
          breadth: line.breadth || null,
          height: line.height || null,
          quantity: line.quantity,
          rate: line.rate,
          amount: (qty * rate).toFixed(2),
        };
      }),
    );

    return this.findById(tenantId, mbId);
  }

  private async generateMbNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `MB-${year}-`;

    const all = await this.db
      .select({ mbNumber: measurementBooks.mbNumber })
      .from(measurementBooks)
      .where(
        and(
          eq(measurementBooks.tenantId, tenantId),
          like(measurementBooks.mbNumber, `${prefix}%`),
        ),
      );

    return `${prefix}${(all.length + 1).toString().padStart(4, '0')}`;
  }
}
