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
  onboardingTemplates,
  onboardingTemplateTasks,
  onboardingChecklists,
  onboardingTasks,
} from '../../../database/schema/hr-onboarding.js';
import { employees } from '../../../database/schema/hr.js';
import { OnboardingTemplateService } from './onboarding-template.service.js';
import { UpdateOnboardingTaskStatusDto } from './dto/onboarding.dto.js';

// Event name kept literal to remain robust against concurrent edits to events.constants.ts.
// Mirrors EVENTS.EMPLOYEE_CREATED ('hr.employee.created').
const EMPLOYEE_CREATED_EVENT = 'hr.employee.created';

type ChecklistStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

@Injectable()
export class OnboardingChecklistService {
  private readonly logger = new Logger(OnboardingChecklistService.name);

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly templateService: OnboardingTemplateService,
  ) {}

  async findAll(tenantId: string, options?: { status?: ChecklistStatus; employeeId?: string }) {
    const conditions = [
      eq(onboardingChecklists.tenantId, tenantId),
      isNull(onboardingChecklists.deletedAt),
    ];
    if (options?.status) {
      conditions.push(eq(onboardingChecklists.status, options.status));
    }
    if (options?.employeeId) {
      conditions.push(eq(onboardingChecklists.employeeId, options.employeeId));
    }

    const rows = await this.db
      .select({
        id: onboardingChecklists.id,
        tenantId: onboardingChecklists.tenantId,
        employeeId: onboardingChecklists.employeeId,
        templateId: onboardingChecklists.templateId,
        status: onboardingChecklists.status,
        startedAt: onboardingChecklists.startedAt,
        completedAt: onboardingChecklists.completedAt,
        createdAt: onboardingChecklists.createdAt,
        updatedAt: onboardingChecklists.updatedAt,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        employeeCode: employees.employeeId,
      })
      .from(onboardingChecklists)
      .leftJoin(employees, eq(onboardingChecklists.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(onboardingChecklists.createdAt));

    return rows;
  }

  async findById(tenantId: string, id: string) {
    const [checklist] = await this.db
      .select()
      .from(onboardingChecklists)
      .where(
        and(
          eq(onboardingChecklists.id, id),
          eq(onboardingChecklists.tenantId, tenantId),
          isNull(onboardingChecklists.deletedAt),
        ),
      )
      .limit(1);

    if (!checklist) throw new NotFoundException('Onboarding checklist not found');

    const tasks = await this.db
      .select()
      .from(onboardingTasks)
      .where(eq(onboardingTasks.checklistId, id))
      .orderBy(asc(onboardingTasks.sequence));

    return { ...checklist, tasks };
  }

  async createFromTemplate(tenantId: string, employeeId: string, templateId: string) {
    // Validate employee
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

    // Validate template
    const [tpl] = await this.db
      .select()
      .from(onboardingTemplates)
      .where(
        and(
          eq(onboardingTemplates.id, templateId),
          eq(onboardingTemplates.tenantId, tenantId),
          isNull(onboardingTemplates.deletedAt),
        ),
      )
      .limit(1);
    if (!tpl) throw new NotFoundException('Onboarding template not found');

    // Avoid duplicate active checklist for same employee
    const [existing] = await this.db
      .select()
      .from(onboardingChecklists)
      .where(
        and(
          eq(onboardingChecklists.tenantId, tenantId),
          eq(onboardingChecklists.employeeId, employeeId),
          isNull(onboardingChecklists.deletedAt),
        ),
      )
      .limit(1);
    if (existing) {
      throw new BadRequestException(
        'An onboarding checklist already exists for this employee',
      );
    }

    const tplTasks = await this.db
      .select()
      .from(onboardingTemplateTasks)
      .where(eq(onboardingTemplateTasks.templateId, templateId))
      .orderBy(asc(onboardingTemplateTasks.sequence));

    const [checklist] = await this.db
      .insert(onboardingChecklists)
      .values({
        tenantId,
        employeeId,
        templateId,
        status: 'pending',
      })
      .returning();

    if (tplTasks.length > 0) {
      const startDate = new Date();
      await this.db.insert(onboardingTasks).values(
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
    dto: UpdateOnboardingTaskStatusDto,
  ) {
    // Verify the task belongs to a checklist owned by this tenant
    const [task] = await this.db
      .select({
        id: onboardingTasks.id,
        checklistId: onboardingTasks.checklistId,
        status: onboardingTasks.status,
        tenantId: onboardingChecklists.tenantId,
      })
      .from(onboardingTasks)
      .innerJoin(
        onboardingChecklists,
        eq(onboardingTasks.checklistId, onboardingChecklists.id),
      )
      .where(eq(onboardingTasks.id, taskId))
      .limit(1);

    if (!task || task.tenantId !== tenantId) {
      throw new NotFoundException('Onboarding task not found');
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
      .update(onboardingTasks)
      .set(updates)
      .where(eq(onboardingTasks.id, taskId))
      .returning();

    await this.recomputeChecklistStatus(task.checklistId);

    return updated;
  }

  private async recomputeChecklistStatus(checklistId: string) {
    const rows = await this.db
      .select({ status: onboardingTasks.status })
      .from(onboardingTasks)
      .where(eq(onboardingTasks.checklistId, checklistId));

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
      // Only set startedAt if not already set
      const [current] = await this.db
        .select({ startedAt: onboardingChecklists.startedAt })
        .from(onboardingChecklists)
        .where(eq(onboardingChecklists.id, checklistId))
        .limit(1);
      if (current && !current.startedAt) updates.startedAt = startedAt;
    }
    if (newStatus === 'completed') updates.completedAt = completedAt;

    await this.db
      .update(onboardingChecklists)
      .set(updates)
      .where(eq(onboardingChecklists.id, checklistId));
  }

  async getPendingTasksFor(tenantId: string, userId: string) {
    return this.db
      .select({
        id: onboardingTasks.id,
        checklistId: onboardingTasks.checklistId,
        title: onboardingTasks.title,
        description: onboardingTasks.description,
        dueDate: onboardingTasks.dueDate,
        status: onboardingTasks.status,
        sequence: onboardingTasks.sequence,
      })
      .from(onboardingTasks)
      .innerJoin(
        onboardingChecklists,
        eq(onboardingTasks.checklistId, onboardingChecklists.id),
      )
      .where(
        and(
          eq(onboardingChecklists.tenantId, tenantId),
          isNull(onboardingChecklists.deletedAt),
          eq(onboardingTasks.assignedTo, userId),
          eq(onboardingTasks.status, 'pending'),
        ),
      )
      .orderBy(asc(onboardingTasks.dueDate));
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

  @OnEvent(EMPLOYEE_CREATED_EVENT)
  async handleEmployeeCreated(payload: {
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
          `No active onboarding template found for tenant ${payload.tenantId}, skipping auto-checklist`,
        );
        return;
      }
      await this.createFromTemplate(payload.tenantId, payload.employeeId, template.id);
      this.logger.log(
        `Auto-created onboarding checklist for employee ${payload.employeeId}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to auto-create onboarding checklist for employee ${payload.employeeId}:`,
        err,
      );
    }
  }
}
