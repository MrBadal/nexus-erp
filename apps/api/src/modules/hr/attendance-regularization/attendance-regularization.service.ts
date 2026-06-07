import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { employees, attendanceRecords } from '../../../database/schema/hr.js';
import {
  attendanceRegularizations,
  type NewAttendanceRegularization,
} from '../../../database/schema/hr-regularization.js';
import { CreateRegularizationDto } from './dto/create-regularization.dto.js';

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'late' | 'on_leave';

@Injectable()
export class AttendanceRegularizationService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ─── Queries ────────────────────────────────────────────

  async findAll(
    tenantId: string,
    options?: {
      employeeId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(attendanceRegularizations.tenantId, tenantId),
      isNull(attendanceRegularizations.deletedAt),
    ];

    if (options?.employeeId) {
      conditions.push(eq(attendanceRegularizations.employeeId, options.employeeId));
    }

    if (options?.status) {
      conditions.push(eq(attendanceRegularizations.status, options.status));
    }

    const rows = await this.db
      .select()
      .from(attendanceRegularizations)
      .where(and(...conditions))
      .orderBy(desc(attendanceRegularizations.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    // Enrich with employee names
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const [emp] = await this.db
          .select({
            firstName: employees.firstName,
            lastName: employees.lastName,
            employeeId: employees.employeeId,
          })
          .from(employees)
          .where(eq(employees.id, row.employeeId))
          .limit(1);

        return {
          ...row,
          employee: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          empId: emp?.employeeId || '',
        };
      }),
    );

    return enriched;
  }

  async findById(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(attendanceRegularizations)
      .where(
        and(
          eq(attendanceRegularizations.id, id),
          eq(attendanceRegularizations.tenantId, tenantId),
          isNull(attendanceRegularizations.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Regularization request with ID "${id}" not found`);
    }

    const [emp] = await this.db
      .select({
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeId: employees.employeeId,
      })
      .from(employees)
      .where(eq(employees.id, row.employeeId))
      .limit(1);

    return {
      ...row,
      employee: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
      empId: emp?.employeeId || '',
    };
  }

  // ─── Create (HR or ESS-self) ────────────────────────────

  async create(
    tenantId: string,
    employeeId: string,
    data: Omit<CreateRegularizationDto, 'employeeId'>,
  ) {
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

    const values: NewAttendanceRegularization = {
      tenantId,
      employeeId,
      date: data.date,
      requestedCheckIn: data.requestedCheckIn ? new Date(data.requestedCheckIn) : null,
      requestedCheckOut: data.requestedCheckOut ? new Date(data.requestedCheckOut) : null,
      requestedStatus: data.requestedStatus,
      reason: data.reason,
      status: 'pending',
    };

    const [created] = await this.db
      .insert(attendanceRegularizations)
      .values(values)
      .returning();

    return created;
  }

  // ─── Review (approve / reject) ──────────────────────────

  private async loadPending(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(attendanceRegularizations)
      .where(
        and(
          eq(attendanceRegularizations.id, id),
          eq(attendanceRegularizations.tenantId, tenantId),
          isNull(attendanceRegularizations.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Regularization request with ID "${id}" not found`);
    }

    if (row.status !== 'pending') {
      throw new BadRequestException(
        `Cannot review a regularization request with status "${row.status}"`,
      );
    }

    return row;
  }

  async approve(tenantId: string, id: string, reviewedBy: string, reviewNotes?: string) {
    const request = await this.loadPending(tenantId, id);

    const [updated] = await this.db
      .update(attendanceRegularizations)
      .set({
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(attendanceRegularizations.id, id))
      .returning();

    // Upsert the underlying attendance record for that day.
    await this.applyToAttendance(tenantId, request);

    return updated;
  }

  async reject(tenantId: string, id: string, reviewedBy: string, reviewNotes?: string) {
    await this.loadPending(tenantId, id);

    const [updated] = await this.db
      .update(attendanceRegularizations)
      .set({
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(attendanceRegularizations.id, id))
      .returning();

    return updated;
  }

  /**
   * Find the attendance record for (tenant, employee, date); if it exists,
   * update its check-in/out/status to the requested values, otherwise insert a
   * new attendance record reflecting the regularization.
   */
  private async applyToAttendance(
    tenantId: string,
    request: typeof attendanceRegularizations.$inferSelect,
  ) {
    const [existing] = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.employeeId, request.employeeId),
          eq(attendanceRecords.date, request.date),
          isNull(attendanceRecords.deletedAt),
        ),
      )
      .limit(1);

    const status = request.requestedStatus as AttendanceStatus;

    if (existing) {
      await this.db
        .update(attendanceRecords)
        .set({
          checkIn: request.requestedCheckIn,
          checkOut: request.requestedCheckOut,
          status,
          updatedAt: new Date(),
        })
        .where(eq(attendanceRecords.id, existing.id));
    } else {
      await this.db.insert(attendanceRecords).values({
        tenantId,
        employeeId: request.employeeId,
        date: request.date,
        checkIn: request.requestedCheckIn,
        checkOut: request.requestedCheckOut,
        status,
      });
    }
  }

  // ─── Delete ─────────────────────────────────────────────

  async softDelete(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(attendanceRegularizations)
      .where(
        and(
          eq(attendanceRegularizations.id, id),
          eq(attendanceRegularizations.tenantId, tenantId),
          isNull(attendanceRegularizations.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Regularization request with ID "${id}" not found`);
    }

    await this.db
      .update(attendanceRegularizations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(attendanceRegularizations.id, id));

    return { message: 'Regularization request deleted' };
  }
}
