import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  projects,
  projectTasks,
} from '../../../database/schema/index.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';

@Injectable()
export class ProjectService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      priority?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(projects.tenantId, tenantId),
      isNull(projects.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(projects.status, options.status as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'),
      );
    }

    if (options?.priority) {
      conditions.push(
        eq(projects.priority, options.priority as 'low' | 'medium' | 'high' | 'critical'),
      );
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(projects.name, searchTerm));
    }

    const result = await this.db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.tenantId, tenantId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }

    const tasks = await this.db
      .select()
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.projectId, id),
          isNull(projectTasks.deletedAt),
        ),
      );

    return { ...project, tasks };
  }

  async create(tenantId: string, data: CreateProjectDto) {
    const projectNumber = await this.generateProjectNumber(tenantId);

    const [project] = await this.db
      .insert(projects)
      .values({
        tenantId,
        projectNumber,
        name: data.name,
        description: data.description || null,
        status: 'planning',
        priority: (data.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
        projectType: data.projectType || null,
        department: data.department || null,
        company: data.company || null,
        estimatedCost: data.estimatedCost || '0',
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        projectManager: data.projectManager || null,
      })
      .returning();

    return project;
  }

  async update(tenantId: string, id: string, data: UpdateProjectDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.projectType !== undefined) updateData.projectType = data.projectType;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost;
    if (data.actualCost !== undefined) updateData.actualCost = data.actualCost;
    if (data.percentComplete !== undefined) updateData.percentComplete = data.percentComplete;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.actualStartDate !== undefined) updateData.actualStartDate = data.actualStartDate;
    if (data.actualEndDate !== undefined) updateData.actualEndDate = data.actualEndDate;
    if (data.projectManager !== undefined) updateData.projectManager = data.projectManager;

    const [updated] = await this.db
      .update(projects)
      .set(updateData)
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'active' | 'on_hold' | 'completed' | 'cancelled',
  ) {
    const project = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      planning: ['active', 'cancelled'],
      active: ['on_hold', 'completed', 'cancelled'],
      on_hold: ['active', 'cancelled'],
    };

    const allowed = validTransitions[project.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${project.status}" to "${newStatus}"`,
      );
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'active' && !project.actualStartDate) {
      updateData.actualStartDate = new Date().toISOString().split('T')[0];
    }

    if (newStatus === 'completed') {
      updateData.actualEndDate = new Date().toISOString().split('T')[0];
      updateData.percentComplete = 100;
    }

    const [updated] = await this.db
      .update(projects)
      .set(updateData)
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const project = await this.findById(tenantId, id);

    if (project.status === 'active') {
      throw new BadRequestException('Cannot delete an active project. Put it on hold or cancel it first.');
    }

    const [deleted] = await this.db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  private async generateProjectNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PROJ-${year}-`;

    const [latest] = await this.db
      .select({ projectNumber: projects.projectNumber })
      .from(projects)
      .where(
        and(
          eq(projects.tenantId, tenantId),
          like(projects.projectNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${projects.projectNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.projectNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
