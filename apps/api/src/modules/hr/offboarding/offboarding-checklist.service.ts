import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq, and, isNull, asc, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  offboardingTemplates,
  offboardingTemplateTasks,
  offboardingChecklists,
  offboardingTasks,
} from '../../../database/schema/hr-onboarding.js';
import { employees } from '../../../database/schema/hr.js';
import { OffboardingTemplateService } from './offboarding-template.service.js';
import { UpdateOffboardingTaskStatusDto } from './dto/offboarding.dto.js';

// Event name kept literal to remain robust against concurrent edits to events.constants.ts.
// Mirrors EVENTS.EMPLOYEE_EXIT_INITIATED ('hr.employee.exit_initiated').
const EMPLOYEE_EXIT_INITIATED_EVENT = 'hr.employee.exit_initiated';

type ChecklistStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

@Injectable()
export class OffboardingChecklistService {
  private readonly logger = new Logger(OffboardingChecklistService.name);

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly templateService: OffboardingTemplateService,
  ) {}

  async findAll(tenantId: string, options?: { status?: ChecklistStatus; employeeId?: string }) {
    const conditions = [
      eq(offboardingChecklists.tenantId, tenantId),
      isNull(offboardingChecklists.deletedAt),
    ];
    if (options?.status) {
      conditions.push(eq(offboardingChecklists.status, options.status));
    }
    if (options?.employeeId) {
      conditions.push(eq(offboardingChecklists.employeeId, options.employeeId));
    }

    const rows = await this.db
      .select({
        id: offboardingChecklists.id,
        tenantId: offboardingChecklists.tenantId,
        employeeId: offboardingChecklists.employeeId,
        templateId: offboardingChecklists.templateId,
        status: offboardingChecklists.status,
        startedAt: offboardingChecklists.startedAt,
        completedAt: offboardingChecklists.completedAt,
        createdAt: offboardingChecklists.createdAt,
        updatedAt: offboardingChecklists.updatedAt,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        employeeCode: employees.employeeId,
      })
      .from(offboardingChecklists)
      .leftJoin(employees, eq(offboardingChecklists.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(offboardingChecklists.createdAt));

    return rows;
  }

  async findById(tenantId: string, id: string) {
    const [checklist] = await this.db
      .select()
      .from(offboardingChecklists)
      .where(
        and(
          eq(offboardingChecklists.id, id),
          eq(offboardingChecklists.tenantId, tenantId),
          isNull(offboardingChecklists.deletedAt),
        ),
      )
      .limit(1);

    if (!checklist) throw new NotFoundException('Offboarding checklist not found');

    const tasks = await this.db
      .select()
      .from(offboardingTasks)
      .where(eq(offboardingTasks.checklistId, id))
      .orderBy(asc(offboardingTasks.sequence));

    return { ...checklist, tasks };
  }

  async createFromTemplate(tenantId: string, employeeId: string, templateId: string) {
    const [emp] = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.tenantId, tenantId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);
    if (!emp) throw new NotFoundException('Employee not found');

    const [tpl] = await this.db
      .select()
      .from(offboardingTemplates)
      .where(
        and(
          eq(offboardingTemplates.id, templateId),
          eq(offboardingTemplates.tenantId, tenantId),
          isNull(offboardingTemplates.deletedAt),
        ),
      )
      .limit(1);
    if (!tpl) throw new NotFoundException('Offboarding template not found');

    const [existing] = await this.db
      .select()
      .from(offboardingChecklists)
      .where(
        and(
          eq(offboardingChecklists.tenantId, tenantId),
          eq(offboardingChecklists.employeeId, employeeId),
          isNull(offboardingChecklists.deletedAt),
        ),
      )
      .limit(1);
    if (existing) {
      throw new BadRequestException(
        'An offboarding checklist already exists for this employee',
      );
    }

    const tplTasks = await this.db
      .select()
      .from(offboardingTemplateTasks)
      .where(eq(offboardingTemplateTasks.templateId, templateId))
      .orderBy(asc(offboardingTemplateTasks.sequence));

    const [checklist] = await this.db
      .insert(offboardingChecklists)
      .values({
        tenantId,
        employeeId,
        templateId,
        status: 'pending',
      })
      .returning();

    if (tplTasks.length > 0) {
      const startDate = new Date();
      await this.db.insert(offboardingTasks).values(
        tplTasks.map((t) => {
          const due = new Date(startDate);
          due.setDate(due.getDate() + (t.dueDays ?? 0));
          return {
            checklistId: checklist.id,
            sequence: t.sequence,
            title: t.title,
            description: t.description,
            assignedTo: null,
            dueDate: due.toISOString().split('T')[0],
            status: 'pending' as const,
          };
        }),
      );
    }

    return this.findById(tenantId, checklist.id);
  }

  async updateTaskStatus(
    tenantId: string,
    taskId: string,
    completedByUserId: string | null,
    dto: UpdateOffboardingTaskStatusDto,
  ) {
    const [task] = await this.db
      .select({
        id: offboardingTasks.id,
        checklistId: offboardingTasks.checklistId,
        status: offboardingTasks.status,
        tenantId: offboardingChecklists.tenantId,
      })
      .from(offboardingTasks)
      .innerJoin(
        offboardingChecklists,
        eq(offboardingTasks.checklistId, offboardingChecklists.id),
      )
      .where(eq(offboardingTasks.id, taskId))
      .limit(1);

    if (!task || task.tenantId !== tenantId) {
      throw new NotFoundException('Offboarding task not found');
    }

    const updates: Record<string, unknown> = {
      status: dto.status,
      updatedAt: new Date(),
    };
    if (dto.notes !== undefined) updates.notes = dto.notes;
    if (dto.status === 'done') {
      updates.completedAt = new Date();
      updates.completedBy = completedByUserId;
    }

    const [updated] = await this.db
      .update(offboardingTasks)
      .set(updates)
      .where(eq(offboardingTasks.id, taskId))
      .returning();

    await this.recomputeChecklistStatus(task.checklistId);

    return updated;
  }

  private async recomputeChecklistStatus(checklistId: string) {
    const rows = await this.db
      .select({ status: offboardingTasks.status })
      .from(offboardingTasks)
      .where(eq(offboardingTasks.checklistId, checklistId));

    if (rows.length === 0) return;

    const allDone = rows.every((r) => r.status === 'done' || r.status === 'skipped');
    const anyDone = rows.some((r) => r.status === 'done');

    let newStatus: ChecklistStatus = 'pending';
    let startedAt: Date | undefined;
    let completedAt: Date | null = null;

    if (allDone) {
      newStatus = 'completed';
      completedAt = new Date();
    } else if (anyDone) {
      newStatus = 'in_progress';
      startedAt = new Date();
    }

    const updates: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
    if (newStatus === 'in_progress') {
      const [current] = await this.db
        .select({ startedAt: offboardingChecklists.startedAt })
        .from(offboardingChecklists)
        .where(eq(offboardingChecklists.id, checklistId))
        .limit(1);
      if (current && !current.startedAt) updates.startedAt = startedAt;
    }
    if (newStatus === 'completed') updates.completedAt = completedAt;

    await this.db
      .update(offboardingChecklists)
      .set(updates)
      .where(eq(offboardingChecklists.id, checklistId));
  }

  async getPendingTasksFor(tenantId: string, userId: string) {
    return this.db
      .select({
        id: offboardingTasks.id,
        checklistId: offboardingTasks.checklistId,
        title: offboardingTasks.title,
        description: offboardingTasks.description,
        dueDate: offboardingTasks.dueDate,
        status: offboardingTasks.status,
        sequence: offboardingTasks.sequence,
      })
      .from(offboardingTasks)
      .innerJoin(
        offboardingChecklists,
        eq(offboardingTasks.checklistId, offboardingChecklists.id),
      )
      .where(
        and(
          eq(offboardingChecklists.tenantId, tenantId),
          isNull(offboardingChecklists.deletedAt),
          eq(offboardingTasks.assignedTo, userId),
          eq(offboardingTasks.status, 'pending'),
        ),
      )
      .orderBy(asc(offboardingTasks.dueDate));
  }

  async kanbanByStatus(tenantId: string) {
    const all = await this.findAll(tenantId);
    const buckets: Record<ChecklistStatus, typeof all> = {
      pending: [],
      in_progress: [],
      completed: [],
      overdue: [],
    };
    for (const cl of all) {
      buckets[cl.status as ChecklistStatus].push(cl);
    }
    return buckets;
  }

  // ─── Auto-creation listener ─────────────────────────────

  @OnEvent(EMPLOYEE_EXIT_INITIATED_EVENT)
  async handleEmployeeExitInitiated(payload: {
    tenantId: string;
    employeeId: string;
    designationId: string | null;
  }) {
    try {
      const template = await this.templateService.findFirstActiveForDesignation(
        payload.tenantId,
        payload.designationId,
      );
      if (!template) {
        this.logger.log(
          `No active offboarding template found for tenant ${payload.tenantId}, skipping auto-checklist`,
        );
        return;
      }
      await this.createFromTemplate(payload.tenantId, payload.employeeId, template.id);
      this.logger.log(
        `Auto-created offboarding checklist for employee ${payload.employeeId}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to auto-create offboarding checklist for employee ${payload.employeeId}:`,
        err,
      );
    }
  }
}
