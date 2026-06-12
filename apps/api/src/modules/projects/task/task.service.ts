import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  projectTasks,
  projects,
} from '../../../database/schema/index.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

@Injectable()
export class TaskService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      projectId?: string;
      status?: string;
      priority?: string;
      assignedTo?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(projectTasks.tenantId, tenantId),
      isNull(projectTasks.deletedAt),
    ];

    if (options?.projectId) {
      conditions.push(eq(projectTasks.projectId, options.projectId));
    }

    if (options?.status) {
      conditions.push(
        eq(projectTasks.status, options.status as 'open' | 'working' | 'pending_review' | 'completed' | 'cancelled' | 'overdue'),
      );
    }

    if (options?.priority) {
      conditions.push(
        eq(projectTasks.priority, options.priority as 'low' | 'medium' | 'high' | 'critical'),
      );
    }

    if (options?.assignedTo) {
      conditions.push(eq(projectTasks.assignedTo, options.assignedTo));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(projectTasks.name, searchTerm));
    }

    const result = await this.db
      .select()
      .from(projectTasks)
      .where(and(...conditions))
      .orderBy(desc(projectTasks.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [task] = await this.db
      .select()
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.id, id),
          eq(projectTasks.tenantId, tenantId),
          isNull(projectTasks.deletedAt),
        ),
      )
      .limit(1);

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    return task;
  }

  async create(tenantId: string, data: CreateTaskDto) {
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

    const taskNumber = await this.generateTaskNumber(tenantId);

    const [task] = await this.db
      .insert(projectTasks)
      .values({
        tenantId,
        projectId: data.projectId,
        taskNumber,
        name: data.name,
        description: data.description || null,
        status: 'open',
        priority: (data.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
        assignedTo: data.assignedTo || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        estimatedHours: data.estimatedHours || '0',
        parentTaskId: data.parentTaskId || null,
        dependsOn: data.dependsOn || null,
        isMilestone: data.isMilestone || false,
      })
      .returning();

    return task;
  }

  async update(tenantId: string, id: string, data: UpdateTaskDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.actualStartDate !== undefined) updateData.actualStartDate = data.actualStartDate;
    if (data.actualEndDate !== undefined) updateData.actualEndDate = data.actualEndDate;
    if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours;
    if (data.actualHours !== undefined) updateData.actualHours = data.actualHours;
    if (data.percentComplete !== undefined) updateData.percentComplete = data.percentComplete;
    if (data.parentTaskId !== undefined) updateData.parentTaskId = data.parentTaskId;
    if (data.dependsOn !== undefined) updateData.dependsOn = data.dependsOn;
    if (data.isMilestone !== undefined) updateData.isMilestone = data.isMilestone;

    const [updated] = await this.db
      .update(projectTasks)
      .set(updateData)
      .where(and(eq(projectTasks.id, id), eq(projectTasks.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(projectTasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(projectTasks.id, id), eq(projectTasks.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  private async generateTaskNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TASK-${year}-`;

    const [latest] = await this.db
      .select({ taskNumber: projectTasks.taskNumber })
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.tenantId, tenantId),
          like(projectTasks.taskNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${projectTasks.taskNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.taskNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
