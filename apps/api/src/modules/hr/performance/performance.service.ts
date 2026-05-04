import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  reviewCycles,
  kraTemplates,
  goals,
  reviewResponses,
  competencyRatings,
  type KraItem,
} from '../../../database/schema/hr-performance.js';
import { employees, designations } from '../../../database/schema/hr.js';
import {
  CreateCycleDto,
  UpdateCycleDto,
  CreateKraTemplateDto,
  UpdateKraTemplateDto,
  CreateGoalDto,
  UpdateGoalDto,
  ManagerCommentGoalDto,
  SubmitReviewDto,
  SubmitCompetenciesDto,
} from './dto/performance.dto.js';

type CycleStatus = 'draft' | 'open' | 'review' | 'closed';
type GoalStatus = 'draft' | 'active' | 'completed';
type ReviewRole = 'self' | 'manager' | 'peer';

@Injectable()
export class PerformanceService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ─── Review Cycles ────────────────────────────────────

  async findAllCycles(tenantId: string, options?: { status?: string; limit?: number; offset?: number }) {
    const conditions = [eq(reviewCycles.tenantId, tenantId)];
    if (options?.status) {
      conditions.push(eq(reviewCycles.status, options.status as CycleStatus));
    }

    return this.db
      .select()
      .from(reviewCycles)
      .where(and(...conditions))
      .orderBy(desc(reviewCycles.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);
  }

  async findCycleById(tenantId: string, id: string) {
    const [cycle] = await this.db
      .select()
      .from(reviewCycles)
      .where(and(eq(reviewCycles.id, id), eq(reviewCycles.tenantId, tenantId)))
      .limit(1);

    if (!cycle) throw new NotFoundException('Review cycle not found');
    return cycle;
  }

  async findActiveCycle(tenantId: string) {
    const [cycle] = await this.db
      .select()
      .from(reviewCycles)
      .where(
        and(
          eq(reviewCycles.tenantId, tenantId),
          inArray(reviewCycles.status, ['open', 'review']),
        ),
      )
      .orderBy(desc(reviewCycles.startDate))
      .limit(1);

    return cycle ?? null;
  }

  async createCycle(tenantId: string, dto: CreateCycleDto) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const [cycle] = await this.db
      .insert(reviewCycles)
      .values({
        tenantId,
        name: dto.name,
        startDate: dto.startDate,
        endDate: dto.endDate,
      })
      .returning();

    return cycle;
  }

  async updateCycle(tenantId: string, id: string, dto: UpdateCycleDto) {
    await this.findCycleById(tenantId, id);

    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.startDate !== undefined) updates.startDate = dto.startDate;
    if (dto.endDate !== undefined) updates.endDate = dto.endDate;
    if (dto.status !== undefined) updates.status = dto.status;

    if (Object.keys(updates).length === 0) {
      return this.findCycleById(tenantId, id);
    }

    const [updated] = await this.db
      .update(reviewCycles)
      .set(updates)
      .where(eq(reviewCycles.id, id))
      .returning();

    return updated;
  }

  async deleteCycle(tenantId: string, id: string) {
    const cycle = await this.findCycleById(tenantId, id);
    if (cycle.status !== 'draft') {
      throw new BadRequestException('Only draft cycles can be deleted');
    }
    await this.db.delete(reviewCycles).where(eq(reviewCycles.id, id));
    return { id, deleted: true };
  }

  // ─── KRA Templates ────────────────────────────────────

  async findAllTemplates(tenantId: string, options?: { designationId?: string }) {
    const conditions = [eq(kraTemplates.tenantId, tenantId)];
    if (options?.designationId) {
      conditions.push(eq(kraTemplates.designationId, options.designationId));
    }

    return this.db
      .select({
        id: kraTemplates.id,
        tenantId: kraTemplates.tenantId,
        name: kraTemplates.name,
        designationId: kraTemplates.designationId,
        kras: kraTemplates.kras,
        createdAt: kraTemplates.createdAt,
        designationName: designations.name,
      })
      .from(kraTemplates)
      .leftJoin(designations, eq(kraTemplates.designationId, designations.id))
      .where(and(...conditions))
      .orderBy(desc(kraTemplates.createdAt));
  }

  async findTemplateById(tenantId: string, id: string) {
    const [template] = await this.db
      .select()
      .from(kraTemplates)
      .where(and(eq(kraTemplates.id, id), eq(kraTemplates.tenantId, tenantId)))
      .limit(1);

    if (!template) throw new NotFoundException('KRA template not found');
    return template;
  }

  async createTemplate(tenantId: string, dto: CreateKraTemplateDto) {
    this.validateKraWeights(dto.kras);

    const [template] = await this.db
      .insert(kraTemplates)
      .values({
        tenantId,
        name: dto.name,
        designationId: dto.designationId ?? null,
        kras: dto.kras as KraItem[],
      })
      .returning();

    return template;
  }

  async updateTemplate(tenantId: string, id: string, dto: UpdateKraTemplateDto) {
    await this.findTemplateById(tenantId, id);

    if (dto.kras) {
      this.validateKraWeights(dto.kras);
    }

    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.designationId !== undefined) updates.designationId = dto.designationId;
    if (dto.kras !== undefined) updates.kras = dto.kras as KraItem[];

    if (Object.keys(updates).length === 0) {
      return this.findTemplateById(tenantId, id);
    }

    const [updated] = await this.db
      .update(kraTemplates)
      .set(updates)
      .where(eq(kraTemplates.id, id))
      .returning();

    return updated;
  }

  async deleteTemplate(tenantId: string, id: string) {
    await this.findTemplateById(tenantId, id);
    await this.db.delete(kraTemplates).where(eq(kraTemplates.id, id));
    return { id, deleted: true };
  }

  private validateKraWeights(kras: { weight: number }[]) {
    if (!Array.isArray(kras) || kras.length === 0) {
      throw new BadRequestException('At least one KRA item is required');
    }
    const total = kras.reduce((sum, k) => sum + Number(k.weight ?? 0), 0);
    if (total > 100.01) {
      throw new BadRequestException(
        `KRA weights must total <= 100 (currently ${total.toFixed(2)})`,
      );
    }
  }

  // ─── Goals ────────────────────────────────────────────

  async findAllGoals(
    tenantId: string,
    options?: { employeeId?: string; cycleId?: string; status?: string },
  ) {
    const conditions = [eq(goals.tenantId, tenantId)];
    if (options?.employeeId) {
      conditions.push(eq(goals.employeeId, options.employeeId));
    }
    if (options?.cycleId) {
      conditions.push(eq(goals.cycleId, options.cycleId));
    }
    if (options?.status) {
      conditions.push(eq(goals.status, options.status as GoalStatus));
    }

    return this.db
      .select()
      .from(goals)
      .where(and(...conditions))
      .orderBy(desc(goals.createdAt));
  }

  async findGoalById(tenantId: string, id: string) {
    const [goal] = await this.db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.tenantId, tenantId)))
      .limit(1);

    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }

  /**
   * Create goal. If invoked via ESS, scopedEmployeeId is enforced and dto.employeeId ignored.
   */
  async createGoal(tenantId: string, dto: CreateGoalDto, scopedEmployeeId?: string) {
    const employeeId = scopedEmployeeId ?? dto.employeeId;
    if (!employeeId) {
      throw new BadRequestException('employeeId is required');
    }

    // Verify employee belongs to this tenant.
    const [emp] = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)))
      .limit(1);
    if (!emp) throw new NotFoundException('Employee not found');

    // Verify cycle exists and is open or in review.
    const cycle = await this.findCycleById(tenantId, dto.cycleId);
    if (cycle.status === 'closed') {
      throw new BadRequestException('Cannot create goals for a closed cycle');
    }

    const [goal] = await this.db
      .insert(goals)
      .values({
        tenantId,
        employeeId,
        cycleId: dto.cycleId,
        title: dto.title,
        weight: dto.weight !== undefined ? String(dto.weight) : '0',
        target: dto.target ?? null,
      })
      .returning();

    return goal;
  }

  async updateGoal(
    tenantId: string,
    id: string,
    dto: UpdateGoalDto,
    scopedEmployeeId?: string,
  ) {
    const goal = await this.findGoalById(tenantId, id);

    if (scopedEmployeeId && goal.employeeId !== scopedEmployeeId) {
      throw new ForbiddenException('You can only update your own goals');
    }

    const updates: Record<string, unknown> = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.weight !== undefined) updates.weight = String(dto.weight);
    if (dto.target !== undefined) updates.target = dto.target;
    if (dto.achievement !== undefined) updates.achievement = dto.achievement;
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.selfRating !== undefined) updates.selfRating = dto.selfRating;

    if (Object.keys(updates).length === 0) return goal;

    const [updated] = await this.db
      .update(goals)
      .set(updates)
      .where(eq(goals.id, id))
      .returning();

    return updated;
  }

  async managerCommentGoal(
    tenantId: string,
    id: string,
    dto: ManagerCommentGoalDto,
  ) {
    await this.findGoalById(tenantId, id);

    const updates: Record<string, unknown> = {};
    if (dto.managerRating !== undefined) updates.managerRating = dto.managerRating;
    if (dto.managerComment !== undefined) updates.managerComment = dto.managerComment;
    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('Provide managerRating or managerComment');
    }

    const [updated] = await this.db
      .update(goals)
      .set(updates)
      .where(eq(goals.id, id))
      .returning();

    return updated;
  }

  async deleteGoal(tenantId: string, id: string, scopedEmployeeId?: string) {
    const goal = await this.findGoalById(tenantId, id);
    if (scopedEmployeeId && goal.employeeId !== scopedEmployeeId) {
      throw new ForbiddenException('You can only delete your own goals');
    }
    if (goal.status === 'completed') {
      throw new BadRequestException('Completed goals cannot be deleted');
    }
    await this.db.delete(goals).where(eq(goals.id, id));
    return { id, deleted: true };
  }

  // ─── Reviews ──────────────────────────────────────────

  async submitReview(
    tenantId: string,
    dto: SubmitReviewDto,
    reviewerEmployeeId: string,
    scopedEmployeeId?: string,
  ) {
    // Self-review must be for self.
    if (dto.role === 'self') {
      const subject = scopedEmployeeId ?? dto.employeeId;
      if (subject !== reviewerEmployeeId) {
        throw new ForbiddenException('Self-review can only be submitted for yourself');
      }
    }

    const cycle = await this.findCycleById(tenantId, dto.cycleId);
    if (cycle.status !== 'open' && cycle.status !== 'review') {
      throw new BadRequestException('Cycle must be in open or review state');
    }

    const employeeId = scopedEmployeeId && dto.role === 'self' ? scopedEmployeeId : dto.employeeId;

    // Upsert: replace existing response by (cycle, employee, reviewer, role).
    const existing = await this.db
      .select({ id: reviewResponses.id })
      .from(reviewResponses)
      .where(
        and(
          eq(reviewResponses.tenantId, tenantId),
          eq(reviewResponses.cycleId, dto.cycleId),
          eq(reviewResponses.employeeId, employeeId),
          eq(reviewResponses.reviewerId, reviewerEmployeeId),
          eq(reviewResponses.role, dto.role as ReviewRole),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(reviewResponses)
        .set({
          responses: dto.responses,
          overallRating:
            dto.overallRating !== undefined ? String(dto.overallRating) : null,
          submittedAt: new Date(),
        })
        .where(eq(reviewResponses.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(reviewResponses)
      .values({
        tenantId,
        cycleId: dto.cycleId,
        employeeId,
        reviewerId: reviewerEmployeeId,
        role: dto.role as ReviewRole,
        responses: dto.responses,
        overallRating:
          dto.overallRating !== undefined ? String(dto.overallRating) : null,
        submittedAt: new Date(),
      })
      .returning();

    return created;
  }

  async findReviewsForCycle(
    tenantId: string,
    cycleId: string,
    options?: { employeeId?: string },
  ) {
    const conditions = [
      eq(reviewResponses.tenantId, tenantId),
      eq(reviewResponses.cycleId, cycleId),
    ];
    if (options?.employeeId) {
      conditions.push(eq(reviewResponses.employeeId, options.employeeId));
    }

    return this.db
      .select()
      .from(reviewResponses)
      .where(and(...conditions))
      .orderBy(desc(reviewResponses.submittedAt));
  }

  async findMyReviews(tenantId: string, employeeId: string) {
    return this.db
      .select()
      .from(reviewResponses)
      .where(
        and(
          eq(reviewResponses.tenantId, tenantId),
          eq(reviewResponses.employeeId, employeeId),
        ),
      )
      .orderBy(desc(reviewResponses.submittedAt));
  }

  // ─── Competencies ─────────────────────────────────────

  async submitCompetencies(tenantId: string, dto: SubmitCompetenciesDto) {
    await this.findCycleById(tenantId, dto.cycleId);

    // Replace existing entries for (cycle, employee).
    await this.db
      .delete(competencyRatings)
      .where(
        and(
          eq(competencyRatings.tenantId, tenantId),
          eq(competencyRatings.cycleId, dto.cycleId),
          eq(competencyRatings.employeeId, dto.employeeId),
        ),
      );

    if (dto.competencies.length === 0) return [];

    const rows = await this.db
      .insert(competencyRatings)
      .values(
        dto.competencies.map((c) => ({
          tenantId,
          cycleId: dto.cycleId,
          employeeId: dto.employeeId,
          competency: c.competency,
          selfRating: c.selfRating ?? null,
          managerRating: c.managerRating ?? null,
        })),
      )
      .returning();

    return rows;
  }

  // ─── Reports ──────────────────────────────────────────

  async cycleReport(tenantId: string, cycleId: string) {
    const cycle = await this.findCycleById(tenantId, cycleId);

    // Aggregate per employee: goal counts, avg ratings, review submission counts.
    const goalAgg = await this.db
      .select({
        employeeId: goals.employeeId,
        totalGoals: sql<number>`count(*)::int`,
        completed: sql<number>`sum(case when ${goals.status} = 'completed' then 1 else 0 end)::int`,
        avgSelf: sql<number | null>`avg(${goals.selfRating})`,
        avgManager: sql<number | null>`avg(${goals.managerRating})`,
        weightedSelf: sql<number | null>`sum(${goals.selfRating} * ${goals.weight}) / nullif(sum(${goals.weight}), 0)`,
        weightedManager: sql<number | null>`sum(${goals.managerRating} * ${goals.weight}) / nullif(sum(${goals.weight}), 0)`,
      })
      .from(goals)
      .where(and(eq(goals.tenantId, tenantId), eq(goals.cycleId, cycleId)))
      .groupBy(goals.employeeId);

    const reviewAgg = await this.db
      .select({
        employeeId: reviewResponses.employeeId,
        role: reviewResponses.role,
        count: sql<number>`count(*)::int`,
        avgRating: sql<number | null>`avg(${reviewResponses.overallRating})`,
      })
      .from(reviewResponses)
      .where(
        and(
          eq(reviewResponses.tenantId, tenantId),
          eq(reviewResponses.cycleId, cycleId),
        ),
      )
      .groupBy(reviewResponses.employeeId, reviewResponses.role);

    // Hydrate employee names.
    const employeeIds = Array.from(
      new Set([
        ...goalAgg.map((g) => g.employeeId),
        ...reviewAgg.map((r) => r.employeeId),
      ]),
    );

    const employeeRows =
      employeeIds.length > 0
        ? await this.db
            .select({
              id: employees.id,
              firstName: employees.firstName,
              lastName: employees.lastName,
              employeeId: employees.employeeId,
            })
            .from(employees)
            .where(
              and(
                eq(employees.tenantId, tenantId),
                inArray(employees.id, employeeIds),
              ),
            )
        : [];

    const employeeMap = new Map(employeeRows.map((e) => [e.id, e]));

    const perEmployee = employeeIds.map((empId) => {
      const goalRow = goalAgg.find((g) => g.employeeId === empId);
      const reviews = reviewAgg.filter((r) => r.employeeId === empId);
      const employee = employeeMap.get(empId);

      return {
        employeeId: empId,
        employeeName: employee
          ? `${employee.firstName} ${employee.lastName}`
          : 'Unknown',
        employeeCode: employee?.employeeId ?? null,
        goals: {
          total: goalRow?.totalGoals ?? 0,
          completed: goalRow?.completed ?? 0,
          avgSelfRating: goalRow?.avgSelf ? Number(goalRow.avgSelf) : null,
          avgManagerRating: goalRow?.avgManager ? Number(goalRow.avgManager) : null,
          weightedSelfScore: goalRow?.weightedSelf
            ? Number(goalRow.weightedSelf)
            : null,
          weightedManagerScore: goalRow?.weightedManager
            ? Number(goalRow.weightedManager)
            : null,
        },
        reviews: {
          self: reviews.find((r) => r.role === 'self') ?? null,
          manager: reviews.find((r) => r.role === 'manager') ?? null,
          peer: reviews.find((r) => r.role === 'peer') ?? null,
        },
      };
    });

    return {
      cycle,
      summary: {
        totalEmployees: employeeIds.length,
        totalGoals: goalAgg.reduce((sum, g) => sum + (g.totalGoals ?? 0), 0),
        totalReviews: reviewAgg.reduce((sum, r) => sum + (r.count ?? 0), 0),
      },
      perEmployee,
    };
  }
}
