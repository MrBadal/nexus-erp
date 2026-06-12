import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { nonConformanceReports } from '../../../database/schema/index.js';
import { CreateNcrDto } from './dto/create-ncr.dto.js';
import { UpdateNcrDto } from './dto/update-ncr.dto.js';

@Injectable()
export class NcrService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      severity?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(nonConformanceReports.tenantId, tenantId),
      isNull(nonConformanceReports.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(nonConformanceReports.status, options.status as 'open' | 'investigation' | 'corrective_action' | 'closed' | 'void'),
      );
    }

    if (options?.severity) {
      conditions.push(
        eq(nonConformanceReports.severity, options.severity as 'minor' | 'major' | 'critical'),
      );
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(nonConformanceReports.ncrNumber, searchTerm));
    }

    const result = await this.db
      .select()
      .from(nonConformanceReports)
      .where(and(...conditions))
      .orderBy(desc(nonConformanceReports.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [ncr] = await this.db
      .select()
      .from(nonConformanceReports)
      .where(
        and(
          eq(nonConformanceReports.id, id),
          eq(nonConformanceReports.tenantId, tenantId),
          isNull(nonConformanceReports.deletedAt),
        ),
      )
      .limit(1);

    if (!ncr) {
      throw new NotFoundException(`Non-conformance report with ID "${id}" not found`);
    }

    return ncr;
  }

  async create(tenantId: string, data: CreateNcrDto) {
    const ncrNumber = await this.generateNcrNumber(tenantId);

    const [ncr] = await this.db
      .insert(nonConformanceReports)
      .values({
        tenantId,
        ncrNumber,
        title: data.title,
        description: data.description || null,
        inspectionId: data.inspectionId || null,
        severity: data.severity as 'minor' | 'major' | 'critical',
        status: 'open',
        rootCause: data.rootCause || null,
        correctiveAction: data.correctiveAction || null,
        preventiveAction: data.preventiveAction || null,
        assignedTo: data.assignedTo || null,
        dueDate: data.dueDate || null,
      })
      .returning();

    return ncr;
  }

  async update(tenantId: string, id: string, data: UpdateNcrDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status === 'closed' || existing.status === 'void') {
      throw new BadRequestException('Closed or voided NCRs cannot be updated');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.inspectionId !== undefined) updateData.inspectionId = data.inspectionId;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.rootCause !== undefined) updateData.rootCause = data.rootCause;
    if (data.correctiveAction !== undefined) updateData.correctiveAction = data.correctiveAction;
    if (data.preventiveAction !== undefined) updateData.preventiveAction = data.preventiveAction;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;

    const [updated] = await this.db
      .update(nonConformanceReports)
      .set(updateData)
      .where(and(eq(nonConformanceReports.id, id), eq(nonConformanceReports.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'investigation' | 'corrective_action' | 'closed' | 'void',
  ) {
    const ncr = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      open: ['investigation', 'void'],
      investigation: ['corrective_action', 'closed', 'void'],
      corrective_action: ['closed', 'void'],
    };

    const allowed = validTransitions[ncr.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${ncr.status}" to "${newStatus}"`,
      );
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'closed') {
      updateData.closedDate = new Date().toISOString().split('T')[0];
    }

    const [updated] = await this.db
      .update(nonConformanceReports)
      .set(updateData)
      .where(and(eq(nonConformanceReports.id, id), eq(nonConformanceReports.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const ncr = await this.findById(tenantId, id);

    if (ncr.status !== 'open') {
      throw new BadRequestException('Only open NCRs can be deleted');
    }

    const [deleted] = await this.db
      .update(nonConformanceReports)
      .set({ deletedAt: new Date() })
      .where(and(eq(nonConformanceReports.id, id), eq(nonConformanceReports.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  private async generateNcrNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `NCR-${year}-`;

    const [latest] = await this.db
      .select({ ncrNumber: nonConformanceReports.ncrNumber })
      .from(nonConformanceReports)
      .where(
        and(
          eq(nonConformanceReports.tenantId, tenantId),
          like(nonConformanceReports.ncrNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${nonConformanceReports.ncrNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.ncrNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
