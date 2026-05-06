import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, asc, desc, sql, inArray } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  leaveTypes,
  leaveAllocations,
  leaveApplications,
  employees,
  type NewLeaveType,
  type NewLeaveApplication,
} from '../../../database/schema/index.js';
import { EVENTS } from '../../../common/events.constants.js';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto.js';
import { CreateLeaveApplicationDto } from './dto/create-leave-application.dto.js';

@Injectable()
export class LeaveService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Leave Types ────────────────────────────────────────

  async findAllLeaveTypes(tenantId: string) {
    return this.db
      .select()
      .from(leaveTypes)
      .where(and(eq(leaveTypes.tenantId, tenantId), isNull(leaveTypes.deletedAt)))
      .orderBy(asc(leaveTypes.name));
  }

  async createLeaveType(tenantId: string, data: CreateLeaveTypeDto) {
    const [existing] = await this.db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.code, data.code),
          eq(leaveTypes.tenantId, tenantId),
          isNull(leaveTypes.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Leave type with code "${data.code}" already exists`);
    }

    const values: NewLeaveType = {
      tenantId,
      name: data.name,
      code: data.code,
      defaultDays: data.defaultDays ?? 0,
      isPaid: data.isPaid ?? true,
      isCarryForward: data.isCarryForward ?? false,
      maxCarryForwardDays: data.maxCarryForwardDays ?? 0,
      isActive: data.isActive ?? true,
    };

    const [leaveType] = await this.db
      .insert(leaveTypes)
      .values(values)
      .returning();

    return leaveType;
  }

  // ─── Leave Applications ─────────────────────────────────

  async findAllLeaveApplications(
    tenantId: string,
    options?: { employeeId?: string; status?: string; limit?: number; offset?: number },
  ) {
    const conditions = [
      eq(leaveApplications.tenantId, tenantId),
      isNull(leaveApplications.deletedAt),
    ];

    if (options?.employeeId) {
      conditions.push(eq(leaveApplications.employeeId, options.employeeId));
    }

    if (options?.status) {
      conditions.push(
        eq(
          leaveApplications.status,
          options.status as 'pending' | 'approved' | 'rejected' | 'cancelled',
        ),
      );
    }

    const rows = await this.db
      .select()
      .from(leaveApplications)
      .where(and(...conditions))
      .orderBy(desc(leaveApplications.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    // Enrich with employee names and leave type names
    const enriched = await Promise.all(
      rows.map(async (app) => {
        const [emp] = await this.db
          .select({ firstName: employees.firstName, lastName: employees.lastName, employeeId: employees.employeeId })
          .from(employees)
          .where(eq(employees.id, app.employeeId))
          .limit(1);

        const [lt] = await this.db
          .select({ name: leaveTypes.name })
          .from(leaveTypes)
          .where(eq(leaveTypes.id, app.leaveTypeId))
          .limit(1);

        return {
          ...app,
          employee: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          empId: emp?.employeeId || '',
          leaveType: lt?.name || 'Unknown',
        };
      }),
    );

    return enriched;
  }

  async findLeaveApplicationById(tenantId: string, id: string) {
    const [application] = await this.db
      .select()
      .from(leaveApplications)
      .where(
        and(
          eq(leaveApplications.id, id),
          eq(leaveApplications.tenantId, tenantId),
          isNull(leaveApplications.deletedAt),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundException(`Leave application with ID "${id}" not found`);
    }

    // Join employee and leave type names
    const [employee] = await this.db
      .select({ firstName: employees.firstName, lastName: employees.lastName, employeeId: employees.employeeId })
      .from(employees)
      .where(eq(employees.id, application.employeeId))
      .limit(1);

    const [leaveType] = await this.db
      .select({ name: leaveTypes.name })
      .from(leaveTypes)
      .where(eq(leaveTypes.id, application.leaveTypeId))
      .limit(1);

    return {
      ...application,
      employee: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
      empId: employee?.employeeId || '',
      leaveType: leaveType?.name || 'Unknown',
    };
  }

  async createLeaveApplication(tenantId: string, data: CreateLeaveApplicationDto) {
    // Validate employee
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, data.employeeId),
          eq(employees.tenantId, tenantId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Validate leave type
    const [leaveType] = await this.db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.id, data.leaveTypeId),
          eq(leaveTypes.tenantId, tenantId),
          isNull(leaveTypes.deletedAt),
        ),
      )
      .limit(1);

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    if (!leaveType.isActive) {
      throw new BadRequestException('This leave type is not active');
    }

    // Check leave balance
    const balance = await this.getLeaveBalance(tenantId, data.employeeId);
    const allocation = balance.find((b) => b.leaveTypeId === data.leaveTypeId);

    if (allocation) {
      const remaining = allocation.totalDays - allocation.usedDays;
      if (data.totalDays > remaining) {
        throw new BadRequestException(
          `Insufficient leave balance. Available: ${remaining} days, Requested: ${data.totalDays} days`,
        );
      }
    }

    const values: NewLeaveApplication = {
      tenantId,
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      fromDate: data.fromDate,
      toDate: data.toDate,
      totalDays: data.totalDays,
      reason: data.reason || null,
      status: 'pending',
    };

    const [application] = await this.db
      .insert(leaveApplications)
      .values(values)
      .returning();

    return application;
  }

  async approveLeaveApplication(tenantId: string, id: string, approvedBy: string) {
    const [application] = await this.db
      .select()
      .from(leaveApplications)
      .where(
        and(
          eq(leaveApplications.id, id),
          eq(leaveApplications.tenantId, tenantId),
          isNull(leaveApplications.deletedAt),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundException(`Leave application with ID "${id}" not found`);
    }

    if (application.status !== 'pending') {
      throw new BadRequestException(`Cannot approve a leave application with status "${application.status}"`);
    }

    // Update the application
    const [updated] = await this.db
      .update(leaveApplications)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leaveApplications.id, id))
      .returning();

    // Update leave allocation used days
    const currentYear = new Date().getFullYear().toString();
    const [allocation] = await this.db
      .select()
      .from(leaveAllocations)
      .where(
        and(
          eq(leaveAllocations.employeeId, application.employeeId),
          eq(leaveAllocations.leaveTypeId, application.leaveTypeId),
          eq(leaveAllocations.tenantId, tenantId),
          eq(leaveAllocations.fiscalYear, currentYear),
          isNull(leaveAllocations.deletedAt),
        ),
      )
      .limit(1);

    if (allocation) {
      await this.db
        .update(leaveAllocations)
        .set({
          usedDays: allocation.usedDays + application.totalDays,
          updatedAt: new Date(),
        })
        .where(eq(leaveAllocations.id, allocation.id));
    }

    // Emit event for auto-creating attendance records
    this.eventEmitter.emit(EVENTS.LEAVE_APPROVED, {
      tenantId,
      applicationId: updated.id,
      employeeId: updated.employeeId,
      fromDate: updated.fromDate,
      toDate: updated.toDate,
      totalDays: updated.totalDays,
    });

    // Email notification to employee
    this.eventEmitter.emit('hr.leave.decided', {
      tenantId,
      employeeId: updated.employeeId,
      decision: 'approved' as const,
      fromDate: updated.fromDate,
      toDate: updated.toDate,
    });

    return updated;
  }

  async rejectLeaveApplication(tenantId: string, id: string, approvedBy: string, reason?: string) {
    const [application] = await this.db
      .select()
      .from(leaveApplications)
      .where(
        and(
          eq(leaveApplications.id, id),
          eq(leaveApplications.tenantId, tenantId),
          isNull(leaveApplications.deletedAt),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundException(`Leave application with ID "${id}" not found`);
    }

    if (application.status !== 'pending') {
      throw new BadRequestException(`Cannot reject a leave application with status "${application.status}"`);
    }

    const [updated] = await this.db
      .update(leaveApplications)
      .set({
        status: 'rejected',
        approvedBy,
        approvedAt: new Date(),
        rejectedReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(leaveApplications.id, id))
      .returning();

    this.eventEmitter.emit('hr.leave.decided', {
      tenantId,
      employeeId: updated.employeeId,
      decision: 'rejected' as const,
      fromDate: updated.fromDate,
      toDate: updated.toDate,
      notes: reason,
    });

    return updated;
  }

  // ─── Leave Balance ──────────────────────────────────────

  async getLeaveBalance(tenantId: string, employeeId: string) {
    // Validate employee exists
    const [employee] = await this.db
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

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const currentYear = new Date().getFullYear().toString();

    const allocations = await this.db
      .select({
        id: leaveAllocations.id,
        leaveTypeId: leaveAllocations.leaveTypeId,
        leaveTypeName: leaveTypes.name,
        leaveTypeCode: leaveTypes.code,
        fiscalYear: leaveAllocations.fiscalYear,
        totalDays: leaveAllocations.totalDays,
        usedDays: leaveAllocations.usedDays,
        carriedForwardDays: leaveAllocations.carriedForwardDays,
      })
      .from(leaveAllocations)
      .innerJoin(leaveTypes, eq(leaveAllocations.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveAllocations.employeeId, employeeId),
          eq(leaveAllocations.tenantId, tenantId),
          eq(leaveAllocations.fiscalYear, currentYear),
          isNull(leaveAllocations.deletedAt),
        ),
      );

    return allocations.map((a) => ({
      ...a,
      remainingDays: a.totalDays - a.usedDays,
    }));
  }

  // ─── ESS (Employee Self-Service) ────────────────────────

  /**
   * Withdraw a leave application that the user submitted themselves.
   * Only PENDING applications belonging to the current employee can be
   * withdrawn — once approved/rejected the user cannot cancel them.
   */
  async withdrawMyLeave(tenantId: string, employeeId: string, id: string) {
    const [application] = await this.db
      .select()
      .from(leaveApplications)
      .where(
        and(
          eq(leaveApplications.id, id),
          eq(leaveApplications.tenantId, tenantId),
          eq(leaveApplications.employeeId, employeeId),
          isNull(leaveApplications.deletedAt),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    if (application.status !== 'pending') {
      throw new BadRequestException(
        `Only pending leave applications can be withdrawn (current status: ${application.status})`,
      );
    }

    const [updated] = await this.db
      .update(leaveApplications)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(leaveApplications.id, id))
      .returning();

    return updated;
  }

  /**
   * Team calendar — list approved + pending leave applications for the
   * current employee's department for a given month (YYYY-MM).
   */
  async getTeamCalendar(
    tenantId: string,
    employeeId: string,
    month: string,
    departmentId: string | null,
  ) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('month must be in YYYY-MM format');
    }
    if (!departmentId) {
      // No department -> empty team
      return [];
    }
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    // Find all employees in the same department
    const colleagues = await this.db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
      })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.departmentId, departmentId),
          isNull(employees.deletedAt),
        ),
      );

    if (colleagues.length === 0) return [];
    const colleagueIds = colleagues.map((c) => c.id);
    const colleagueMap = new Map(colleagues.map((c) => [c.id, c]));

    const apps = await this.db
      .select({
        id: leaveApplications.id,
        employeeId: leaveApplications.employeeId,
        leaveTypeId: leaveApplications.leaveTypeId,
        leaveTypeName: leaveTypes.name,
        fromDate: leaveApplications.fromDate,
        toDate: leaveApplications.toDate,
        totalDays: leaveApplications.totalDays,
        status: leaveApplications.status,
      })
      .from(leaveApplications)
      .innerJoin(leaveTypes, eq(leaveApplications.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveApplications.tenantId, tenantId),
          inArray(leaveApplications.employeeId, colleagueIds),
          isNull(leaveApplications.deletedAt),
          inArray(leaveApplications.status, ['pending', 'approved']),
          sql`${leaveApplications.fromDate} <= ${endDate}`,
          sql`${leaveApplications.toDate} >= ${startDate}`,
        ),
      )
      .orderBy(asc(leaveApplications.fromDate));

    return apps.map((a) => {
      const c = colleagueMap.get(a.employeeId);
      return {
        ...a,
        employeeName: c ? `${c.firstName} ${c.lastName}` : 'Unknown',
        isMine: a.employeeId === employeeId,
      };
    });
  }
}
