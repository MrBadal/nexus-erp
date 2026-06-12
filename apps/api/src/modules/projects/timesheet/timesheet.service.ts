import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  timesheets,
  projects,
  projectTasks,
} from '../../../database/schema/index.js';
import { CreateTimesheetDto } from './dto/create-timesheet.dto.js';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto.js';

@Injectable()
export class TimesheetService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      projectId?: string;
      employeeId?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(timesheets.tenantId, tenantId),
      isNull(timesheets.deletedAt),
    ];

    if (options?.projectId) {
      conditions.push(eq(timesheets.projectId, options.projectId));
    }

    if (options?.employeeId) {
      conditions.push(eq(timesheets.employeeId, options.employeeId));
    }

    if (options?.status) {
      conditions.push(
        eq(timesheets.status, options.status as 'draft' | 'submitted' | 'approved' | 'rejected'),
      );
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(timesheets.employeeName, searchTerm));
    }

    const result = await this.db
      .select()
      .from(timesheets)
      .where(and(...conditions))
      .orderBy(desc(timesheets.date))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [timesheet] = await this.db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.id, id),
          eq(timesheets.tenantId, tenantId),
          isNull(timesheets.deletedAt),
        ),
      )
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID "${id}" not found`);
    }

    return timesheet;
  }

  async create(tenantId: string, data: CreateTimesheetDto) {
    // Validate project exists
    const [project] = await this.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, data.projectId),
          eq(projects.tenantId, tenantId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Validate task if provided
    if (data.taskId) {
      const [task] = await this.db
        .select()
        .from(projectTasks)
        .where(
          and(
            eq(projectTasks.id, data.taskId),
            eq(projectTasks.projectId, data.projectId),
            isNull(projectTasks.deletedAt),
          ),
        )
        .limit(1);

      if (!task) {
        throw new BadRequestException('Task not found in the specified project');
      }
    }

    const billingHours = data.billingHours || data.hours;
    const billingRate = data.billingRate || '0';
    const billingAmount = (parseFloat(billingHours) * parseFloat(billingRate)).toFixed(4);

    const [timesheet] = await this.db
      .insert(timesheets)
      .values({
        tenantId,
        employeeId: data.employeeId || null,
        employeeName: data.employeeName,
        projectId: data.projectId,
        taskId: data.taskId || null,
        activityType: data.activityType,
        hours: data.hours,
        billingHours,
        billingRate,
        billingAmount,
        date: data.date,
        description: data.description || null,
        status: 'draft',
      })
      .returning();

    return timesheet;
  }

  async update(tenantId: string, id: string, data: UpdateTimesheetDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft timesheets can be updated');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.taskId !== undefined) updateData.taskId = data.taskId;
    if (data.activityType !== undefined) updateData.activityType = data.activityType;
    if (data.hours !== undefined) updateData.hours = data.hours;
    if (data.billingHours !== undefined) updateData.billingHours = data.billingHours;
    if (data.billingRate !== undefined) updateData.billingRate = data.billingRate;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.description !== undefined) updateData.description = data.description;

    // Recalculate billing amount if hours or rate changed
    const hours = (data.billingHours || existing.billingHours) as string;
    const rate = (data.billingRate || existing.billingRate) as string;
    updateData.billingAmount = (parseFloat(hours) * parseFloat(rate)).toFixed(4);

    const [updated] = await this.db
      .update(timesheets)
      .set(updateData)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'submitted' | 'approved' | 'rejected',
  ) {
    const timesheet = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['submitted'],
      submitted: ['approved', 'rejected'],
      rejected: ['draft', 'submitted'],
    };

    const allowed = validTransitions[timesheet.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${timesheet.status}" to "${newStatus}"`,
      );
    }

    const [updated] = await this.db
      .update(timesheets)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const timesheet = await this.findById(tenantId, id);

    if (timesheet.status === 'approved') {
      throw new BadRequestException('Cannot delete an approved timesheet');
    }

    const [deleted] = await this.db
      .update(timesheets)
      .set({ deletedAt: new Date() })
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
