import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, asc, desc, ilike, or, sql, ne } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  employees,
  departments,
  designations,
  attendanceRecords,
  leaveAllocations,
  leaveTypes,
  payrollEntries,
  expenseClaims,
  type NewEmployee,
  type NewDepartment,
  type NewDesignation,
} from '../../../database/schema/index.js';
import { EVENTS } from '../../../common/events.constants.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { CreateDesignationDto } from './dto/create-designation.dto.js';

interface EmployeeListOptions {
  departmentId?: string;
  status?: string;
  employmentType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class EmployeeService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Employee CRUD ──────────────────────────────────────

  async findAllEmployees(tenantId: string, options?: EmployeeListOptions) {
    const conditions = [
      eq(employees.tenantId, tenantId),
      isNull(employees.deletedAt),
    ];

    if (options?.departmentId) {
      conditions.push(eq(employees.departmentId, options.departmentId));
    }

    if (options?.status) {
      conditions.push(eq(employees.status, options.status as 'active' | 'inactive' | 'terminated' | 'on_leave'));
    }

    if (options?.employmentType) {
      conditions.push(
        eq(employees.employmentType, options.employmentType as 'full_time' | 'part_time' | 'contract' | 'intern'),
      );
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(
        or(
          ilike(employees.firstName, searchTerm),
          ilike(employees.lastName, searchTerm),
          ilike(employees.email, searchTerm),
          ilike(employees.employeeId, searchTerm),
        )!,
      );
    }

    return this.db
      .select()
      .from(employees)
      .where(and(...conditions))
      .orderBy(asc(employees.employeeId))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findEmployeeById(tenantId: string, id: string) {
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, id),
          eq(employees.tenantId, tenantId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);

    if (!employee) {
      throw new NotFoundException(`Employee with ID "${id}" not found`);
    }

    return employee;
  }

  async createEmployee(tenantId: string, data: CreateEmployeeDto) {
    const employeeCode = await this.generateEmployeeId(tenantId);

    // Check email uniqueness within tenant
    const [existing] = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.email, data.email),
          eq(employees.tenantId, tenantId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Employee with email "${data.email}" already exists`);
    }

    // Validate department if provided
    if (data.departmentId) {
      const [dept] = await this.db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.id, data.departmentId),
            eq(departments.tenantId, tenantId),
            isNull(departments.deletedAt),
          ),
        )
        .limit(1);

      if (!dept) {
        throw new BadRequestException('Department not found');
      }
    }

    // Validate designation if provided
    if (data.designationId) {
      const [desig] = await this.db
        .select()
        .from(designations)
        .where(
          and(
            eq(designations.id, data.designationId),
            eq(designations.tenantId, tenantId),
            isNull(designations.deletedAt),
          ),
        )
        .limit(1);

      if (!desig) {
        throw new BadRequestException('Designation not found');
      }
    }

    const values: NewEmployee = {
      tenantId,
      employeeId: employeeCode,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      dateOfBirth: data.dateOfBirth || null,
      gender: (data.gender as 'male' | 'female' | 'other') || null,
      maritalStatus: (data.maritalStatus as 'single' | 'married' | 'divorced' | 'widowed') || null,
      nationalId: data.nationalId || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      postalCode: data.postalCode || null,
      departmentId: data.departmentId || null,
      designationId: data.designationId || null,
      managerId: data.managerId || null,
      userId: data.userId || null,
      employmentType: (data.employmentType as 'full_time' | 'part_time' | 'contract' | 'intern') || 'full_time',
      dateOfJoining: data.dateOfJoining,
      status: 'active',
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      bankName: data.bankName || null,
      bankAccountNumber: data.bankAccountNumber || null,
      bankRoutingNumber: data.bankRoutingNumber || null,
      profileImageUrl: data.profileImageUrl || null,
    };

    const [employee] = await this.db
      .insert(employees)
      .values(values)
      .returning();

    // Emit event for downstream listeners (onboarding auto-checklist, etc.)
    this.eventEmitter.emit(EVENTS.EMPLOYEE_CREATED, {
      tenantId,
      employeeId: employee.id,
      designationId: employee.designationId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      dateOfJoining: employee.dateOfJoining,
    });

    return employee;
  }

  async updateEmployee(tenantId: string, id: string, data: UpdateEmployeeDto) {
    const existing = await this.findEmployeeById(tenantId, id);

    if (data.email) {
      const [conflict] = await this.db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.email, data.email),
            eq(employees.tenantId, tenantId),
            isNull(employees.deletedAt),
            sql`${employees.id} != ${id}`,
          ),
        )
        .limit(1);

      if (conflict) {
        throw new ConflictException(`Employee with email "${data.email}" already exists`);
      }
    }

    if (data.managerId && data.managerId === id) {
      throw new BadRequestException('Employee cannot be their own manager');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.maritalStatus !== undefined) updateData.maritalStatus = data.maritalStatus;
    if (data.nationalId !== undefined) updateData.nationalId = data.nationalId;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.designationId !== undefined) updateData.designationId = data.designationId;
    if (data.managerId !== undefined) updateData.managerId = data.managerId;
    if (data.userId !== undefined) updateData.userId = data.userId;
    if (data.employmentType !== undefined) updateData.employmentType = data.employmentType;
    if (data.dateOfJoining !== undefined) updateData.dateOfJoining = data.dateOfJoining;
    if (data.dateOfLeaving !== undefined) updateData.dateOfLeaving = data.dateOfLeaving;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.emergencyContactName !== undefined) updateData.emergencyContactName = data.emergencyContactName;
    if (data.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = data.emergencyContactPhone;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankAccountNumber !== undefined) updateData.bankAccountNumber = data.bankAccountNumber;
    if (data.bankRoutingNumber !== undefined) updateData.bankRoutingNumber = data.bankRoutingNumber;
    if (data.profileImageUrl !== undefined) updateData.profileImageUrl = data.profileImageUrl;

    const [updated] = await this.db
      .update(employees)
      .set(updateData)
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
      .returning();

    // Emit exit event when dateOfLeaving is set for the first time
    if (
      data.dateOfLeaving !== undefined &&
      data.dateOfLeaving !== null &&
      !existing.dateOfLeaving
    ) {
      this.eventEmitter.emit(EVENTS.EMPLOYEE_EXIT_INITIATED, {
        tenantId,
        employeeId: updated.id,
        designationId: updated.designationId,
        dateOfLeaving: updated.dateOfLeaving,
      });
    }

    return updated;
  }

  async softDeleteEmployee(tenantId: string, id: string) {
    await this.findEmployeeById(tenantId, id);

    const [deleted] = await this.db
      .update(employees)
      .set({ deletedAt: new Date(), status: 'inactive' })
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  // ─── Departments ────────────────────────────────────────

  async findAllDepartments(tenantId: string) {
    return this.db
      .select()
      .from(departments)
      .where(and(eq(departments.tenantId, tenantId), isNull(departments.deletedAt)))
      .orderBy(asc(departments.name));
  }

  async getDepartmentTree(tenantId: string) {
    const allDepts = await this.findAllDepartments(tenantId);

    const deptMap = new Map<string, Record<string, unknown>>();
    const roots: Record<string, unknown>[] = [];

    for (const dept of allDepts) {
      deptMap.set(dept.id, { ...dept, children: [] });
    }

    for (const dept of allDepts) {
      const node = deptMap.get(dept.id)!;
      if (dept.parentId && deptMap.has(dept.parentId)) {
        (deptMap.get(dept.parentId)!.children as Record<string, unknown>[]).push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async createDepartment(tenantId: string, data: CreateDepartmentDto) {
    const [existing] = await this.db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.code, data.code),
          eq(departments.tenantId, tenantId),
          isNull(departments.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Department with code "${data.code}" already exists`);
    }

    if (data.parentId) {
      const [parent] = await this.db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.id, data.parentId),
            eq(departments.tenantId, tenantId),
            isNull(departments.deletedAt),
          ),
        )
        .limit(1);

      if (!parent) {
        throw new BadRequestException('Parent department not found');
      }
    }

    const values: NewDepartment = {
      tenantId,
      name: data.name,
      code: data.code,
      description: data.description || null,
      parentId: data.parentId || null,
      managerId: data.managerId || null,
      isActive: data.isActive ?? true,
    };

    const [department] = await this.db
      .insert(departments)
      .values(values)
      .returning();

    return department;
  }

  async updateDepartment(
    tenantId: string,
    id: string,
    data: Partial<CreateDepartmentDto>,
  ) {
    const [existing] = await this.db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.id, id),
          eq(departments.tenantId, tenantId),
          isNull(departments.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Department with ID "${id}" not found`);
    }

    if (data.parentId && data.parentId === id) {
      throw new BadRequestException('Department cannot be its own parent');
    }

    if (data.code && data.code !== existing.code) {
      const [conflict] = await this.db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.code, data.code),
            eq(departments.tenantId, tenantId),
            isNull(departments.deletedAt),
          ),
        )
        .limit(1);

      if (conflict) {
        throw new ConflictException(`Department with code "${data.code}" already exists`);
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.managerId !== undefined) updateData.managerId = data.managerId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await this.db
      .update(departments)
      .set(updateData)
      .where(and(eq(departments.id, id), eq(departments.tenantId, tenantId)))
      .returning();

    return updated;
  }

  // ─── Designations ──────────────────────────────────────

  async findAllDesignations(tenantId: string) {
    return this.db
      .select()
      .from(designations)
      .where(and(eq(designations.tenantId, tenantId), isNull(designations.deletedAt)))
      .orderBy(asc(designations.level), asc(designations.name));
  }

  async createDesignation(tenantId: string, data: CreateDesignationDto) {
    const values: NewDesignation = {
      tenantId,
      name: data.name,
      description: data.description || null,
      level: data.level ?? 0,
    };

    const [designation] = await this.db
      .insert(designations)
      .values(values)
      .returning();

    return designation;
  }

  // ─── Org chart / team ───────────────────────────────────

  /** Recursive org-chart tree built from manager relationships. */
  async getOrgChart(tenantId: string): Promise<Record<string, unknown>[]> {
    const allRows = await this.db
      .select({
        id: employees.id,
        employeeId: employees.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        managerId: employees.managerId,
        designationId: employees.designationId,
      })
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), isNull(employees.deletedAt)))
      .orderBy(asc(employees.firstName));

    interface Node {
      id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      email: string;
      designation: string | null;
      children: Node[];
    }

    const designationIds = Array.from(
      new Set(allRows.map((r) => r.designationId).filter((d): d is string => !!d)),
    );
    const designationMap = new Map<string, string>();
    if (designationIds.length > 0) {
      const desigRows = await this.db
        .select({ id: designations.id, name: designations.name })
        .from(designations)
        .where(eq(designations.tenantId, tenantId));
      for (const d of desigRows) {
        designationMap.set(d.id, d.name);
      }
    }

    const nodeMap = new Map<string, Node>();
    for (const row of allRows) {
      nodeMap.set(row.id, {
        id: row.id,
        employeeId: row.employeeId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        designation: row.designationId ? designationMap.get(row.designationId) ?? null : null,
        children: [],
      });
    }

    const roots: Node[] = [];
    for (const row of allRows) {
      const node = nodeMap.get(row.id)!;
      if (row.managerId && nodeMap.has(row.managerId)) {
        nodeMap.get(row.managerId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots as unknown as Record<string, unknown>[];
  }

  /** Public team lookup (admin/HR caller). */
  async getTeam(tenantId: string, employeeId: string) {
    return this.getMyTeam(tenantId, employeeId);
  }

  // ─── ESS (Employee Self-Service) ────────────────────────

  /**
   * Get the full profile of the currently scoped employee, joined with
   * department + designation names. Used by the ESS profile page.
   */
  async getMyProfile(tenantId: string, employeeId: string) {
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

    if (!emp) {
      throw new NotFoundException('Employee profile not found');
    }

    let departmentName: string | null = null;
    if (emp.departmentId) {
      const [dept] = await this.db
        .select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, emp.departmentId))
        .limit(1);
      departmentName = dept?.name ?? null;
    }

    let designationName: string | null = null;
    if (emp.designationId) {
      const [desig] = await this.db
        .select({ name: designations.name })
        .from(designations)
        .where(eq(designations.id, emp.designationId))
        .limit(1);
      designationName = desig?.name ?? null;
    }

    return {
      ...emp,
      department: departmentName,
      designation: designationName,
    };
  }

  /**
   * Whitelisted update for ESS — only phone, address (currentAddress),
   * emergencyContactName, emergencyContactPhone may be set.
   * Throws BadRequest if any other field is provided.
   */
  async updateMyProfile(
    tenantId: string,
    employeeId: string,
    payload: Record<string, unknown>,
  ) {
    const allowedKeys = new Set([
      'phone',
      'currentAddress',
      'emergencyContactName',
      'emergencyContactPhone',
    ]);
    const invalidKeys = Object.keys(payload).filter((k) => !allowedKeys.has(k));
    if (invalidKeys.length > 0) {
      throw new BadRequestException(
        `Field(s) not allowed via self-service: ${invalidKeys.join(', ')}`,
      );
    }

    // Confirm employee exists
    await this.findEmployeeById(tenantId, employeeId);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof payload.phone === 'string') {
      updateData.phone = payload.phone || null;
    }
    // currentAddress maps to the `address` column
    if (typeof payload.currentAddress === 'string') {
      updateData.address = payload.currentAddress || null;
    }
    if (typeof payload.emergencyContactName === 'string') {
      updateData.emergencyContactName = payload.emergencyContactName || null;
    }
    if (typeof payload.emergencyContactPhone === 'string') {
      updateData.emergencyContactPhone = payload.emergencyContactPhone || null;
    }

    const [updated] = await this.db
      .update(employees)
      .set(updateData)
      .where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)))
      .returning();

    return updated;
  }

  /**
   * Build the employee's "team" for the ESS team page:
   *   - manager (one)
   *   - peers (other employees in the same department, excluding self)
   *   - direct reports (employees managed by this employee)
   */
  async getMyTeam(tenantId: string, employeeId: string) {
    const me = await this.findEmployeeById(tenantId, employeeId);

    const enrich = async (emp: typeof me) => {
      let designation: string | null = null;
      if (emp.designationId) {
        const [d] = await this.db
          .select({ name: designations.name })
          .from(designations)
          .where(eq(designations.id, emp.designationId))
          .limit(1);
        designation = d?.name ?? null;
      }
      return {
        id: emp.id,
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        designation,
        profileImageUrl: emp.profileImageUrl,
      };
    };

    let manager: Awaited<ReturnType<typeof enrich>> | null = null;
    if (me.managerId) {
      const [m] = await this.db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.id, me.managerId),
            eq(employees.tenantId, tenantId),
            isNull(employees.deletedAt),
          ),
        )
        .limit(1);
      if (m) manager = await enrich(m);
    }

    const peerRows = me.departmentId
      ? await this.db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.tenantId, tenantId),
              eq(employees.departmentId, me.departmentId),
              ne(employees.id, me.id),
              isNull(employees.deletedAt),
            ),
          )
          .orderBy(asc(employees.firstName))
      : [];

    const peers = await Promise.all(peerRows.map(enrich));

    const reportRows = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.managerId, me.id),
          isNull(employees.deletedAt),
        ),
      )
      .orderBy(asc(employees.firstName));

    const directReports = await Promise.all(reportRows.map(enrich));

    return { manager, peers, directReports };
  }

  /**
   * Aggregate ESS dashboard data — leave balance, today's attendance,
   * latest payslip, pending expense count and unread announcements.
   * Announcements are wrapped in try/catch since that table may not
   * exist yet (built in parallel).
   */
  async getEssDashboard(tenantId: string, employeeId: string) {
    const employee = await this.findEmployeeById(tenantId, employeeId);

    const currentYear = new Date().getFullYear().toString();
    const today = new Date().toISOString().split('T')[0];

    // Leave balance
    const leaveRows = await this.db
      .select({
        leaveTypeName: leaveTypes.name,
        leaveTypeCode: leaveTypes.code,
        totalDays: leaveAllocations.totalDays,
        usedDays: leaveAllocations.usedDays,
      })
      .from(leaveAllocations)
      .innerJoin(leaveTypes, eq(leaveAllocations.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveAllocations.tenantId, tenantId),
          eq(leaveAllocations.employeeId, employeeId),
          eq(leaveAllocations.fiscalYear, currentYear),
          isNull(leaveAllocations.deletedAt),
        ),
      );
    const leaveBalances = leaveRows.map((r) => ({
      leaveTypeName: r.leaveTypeName,
      leaveTypeCode: r.leaveTypeCode,
      totalDays: r.totalDays,
      usedDays: r.usedDays,
      remainingDays: r.totalDays - r.usedDays,
    }));

    // Today's attendance
    const [todayAttendance] = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.date, today),
          isNull(attendanceRecords.deletedAt),
        ),
      )
      .limit(1);

    // Latest payslip
    const [latestPayslip] = await this.db
      .select()
      .from(payrollEntries)
      .where(
        and(
          eq(payrollEntries.tenantId, tenantId),
          eq(payrollEntries.employeeId, employeeId),
          isNull(payrollEntries.deletedAt),
        ),
      )
      .orderBy(desc(payrollEntries.period))
      .limit(1);

    // Pending expense claims (draft + submitted)
    const pendingExpenseRows = await this.db
      .select({ id: expenseClaims.id })
      .from(expenseClaims)
      .where(
        and(
          eq(expenseClaims.tenantId, tenantId),
          eq(expenseClaims.employeeId, employeeId),
          isNull(expenseClaims.deletedAt),
          sql`${expenseClaims.status} IN ('draft', 'submitted')`,
        ),
      );

    // Unread announcements — table may not exist yet (parallel module)
    let unreadAnnouncements = 0;
    try {
      const result = (await this.db.execute(
        sql`SELECT COUNT(*)::int AS count FROM announcements a
            WHERE a.tenant_id = ${tenantId}
              AND a.deleted_at IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM announcement_reads ar
                WHERE ar.announcement_id = a.id
                  AND ar.employee_id = ${employeeId}
              )`,
      )) as unknown as { rows?: Array<{ count: number }> } | Array<{ count: number }>;
      const rows = Array.isArray(result) ? result : result.rows ?? [];
      unreadAnnouncements = rows[0]?.count ?? 0;
    } catch {
      unreadAnnouncements = 0;
    }

    return {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.employeeId,
        email: employee.email,
        profileImageUrl: employee.profileImageUrl,
      },
      leaveBalances,
      todayAttendance: todayAttendance ?? null,
      latestPayslip: latestPayslip ?? null,
      pendingExpenses: pendingExpenseRows.length,
      unreadAnnouncements,
    };
  }

  /**
   * Helpers used by other ESS services to fetch a colleague's department
   * (for team-calendar filtering).
   */
  async getDepartmentIdOf(tenantId: string, employeeId: string): Promise<string | null> {
    const [emp] = await this.db
      .select({ departmentId: employees.departmentId })
      .from(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.tenantId, tenantId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);
    return emp?.departmentId ?? null;
  }

  // ─── Helpers ────────────────────────────────────────────

  private async generateEmployeeId(tenantId: string): Promise<string> {
    const prefix = 'EMP-';

    const [latest] = await this.db
      .select({ employeeId: employees.employeeId })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          sql`${employees.employeeId} LIKE ${prefix + '%'}`,
        ),
      )
      .orderBy(desc(employees.employeeId))
      .limit(1);

    let nextNum = 1;
    if (latest) {
      const currentNum = parseInt(latest.employeeId.replace(prefix, ''), 10);
      if (!isNaN(currentNum)) {
        nextNum = currentNum + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }
}
