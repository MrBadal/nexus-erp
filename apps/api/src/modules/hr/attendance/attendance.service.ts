import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, between, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  attendanceRecords,
  employees,
  type NewAttendanceRecord,
} from '../../../database/schema/index.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { CheckOutDto } from './dto/check-out.dto.js';
import { ManualAttendanceDto, UpdateAttendanceDto } from './dto/manual-attendance.dto.js';

@Injectable()
export class AttendanceService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      employeeId?: string;
      fromDate?: string;
      toDate?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(attendanceRecords.tenantId, tenantId),
      isNull(attendanceRecords.deletedAt),
    ];

    if (options?.employeeId) {
      conditions.push(eq(attendanceRecords.employeeId, options.employeeId));
    }

    if (options?.fromDate && options?.toDate) {
      conditions.push(
        between(attendanceRecords.date, options.fromDate, options.toDate),
      );
    }

    if (options?.status) {
      conditions.push(
        eq(
          attendanceRecords.status,
          options.status as 'present' | 'absent' | 'half_day' | 'late' | 'on_leave',
        ),
      );
    }

    return this.db
      .select()
      .from(attendanceRecords)
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.date))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async checkIn(tenantId: string, data: CheckInDto) {
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

    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const [existing] = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, data.employeeId),
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.date, today),
          isNull(attendanceRecords.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException('Employee has already checked in today');
    }

    const now = new Date();

    // Determine if late (after 9:30 AM)
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hours > 9 || (hours === 9 && minutes > 30);

    const values: NewAttendanceRecord = {
      tenantId,
      employeeId: data.employeeId,
      date: today,
      checkIn: now,
      status: isLate ? 'late' : 'present',
      notes: data.notes || null,
    };

    const [record] = await this.db
      .insert(attendanceRecords)
      .values(values)
      .returning();

    return record;
  }

  async checkOut(tenantId: string, data: CheckOutDto) {
    const today = new Date().toISOString().split('T')[0];

    const [record] = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, data.employeeId),
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.date, today),
          isNull(attendanceRecords.deletedAt),
        ),
      )
      .limit(1);

    if (!record) {
      throw new BadRequestException('No check-in found for today. Please check in first.');
    }

    if (record.checkOut) {
      throw new BadRequestException('Employee has already checked out today');
    }

    const now = new Date();
    let workingHours: string | null = null;

    if (record.checkIn) {
      const diffMs = now.getTime() - new Date(record.checkIn).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      workingHours = diffHours.toFixed(2);
    }

    // Determine status
    let status = record.status;
    if (workingHours && parseFloat(workingHours) < 4) {
      status = 'half_day';
    }

    const updateData: Record<string, unknown> = {
      checkOut: now,
      workingHours,
      updatedAt: now,
    };

    if (status !== record.status) {
      updateData.status = status;
    }

    if (data.notes) {
      updateData.notes = record.notes ? `${record.notes}\n${data.notes}` : data.notes;
    }

    const [updated] = await this.db
      .update(attendanceRecords)
      .set(updateData)
      .where(eq(attendanceRecords.id, record.id))
      .returning();

    return updated;
  }

  // ─── HR / Admin manual management ───────────────────────

  /** Fetch a single record (tenant-scoped), throws if missing. */
  async findById(tenantId: string, id: string) {
    const [record] = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.id, id),
          eq(attendanceRecords.tenantId, tenantId),
          isNull(attendanceRecords.deletedAt),
        ),
      )
      .limit(1);
    if (!record) {
      throw new NotFoundException(`Attendance record "${id}" not found`);
    }
    return record;
  }

  /**
   * HR/admin manual creation of an attendance record for any date (e.g. a
   * missed punch). Rejects a duplicate for the same employee+date.
   */
  async manualCreate(tenantId: string, data: ManualAttendanceDto) {
    const [employee] = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.id, data.employeeId),
          eq(employees.tenantId, tenantId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);
    if (!employee) throw new NotFoundException('Employee not found');

    const [existing] = await this.db
      .select({ id: attendanceRecords.id })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.employeeId, data.employeeId),
          eq(attendanceRecords.date, data.date),
          isNull(attendanceRecords.deletedAt),
        ),
      )
      .limit(1);
    if (existing) {
      throw new BadRequestException(
        `An attendance record already exists for this employee on ${data.date}. Edit it instead.`,
      );
    }

    const checkIn = data.checkIn ? new Date(data.checkIn) : null;
    const checkOut = data.checkOut ? new Date(data.checkOut) : null;
    let workingHours: string | null = null;
    if (checkIn && checkOut) {
      const diffHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      if (diffHours > 0) workingHours = diffHours.toFixed(2);
    }

    const [record] = await this.db
      .insert(attendanceRecords)
      .values({
        tenantId,
        employeeId: data.employeeId,
        date: data.date,
        checkIn,
        checkOut,
        status: data.status,
        workingHours,
        notes: data.notes || null,
      })
      .returning();
    return record;
  }

  /** HR/admin correction of an existing attendance record. */
  async update(tenantId: string, id: string, data: UpdateAttendanceDto) {
    const record = await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.date !== undefined) updateData.date = data.date;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.checkIn !== undefined) updateData.checkIn = data.checkIn ? new Date(data.checkIn) : null;
    if (data.checkOut !== undefined) updateData.checkOut = data.checkOut ? new Date(data.checkOut) : null;

    // Recompute working hours when either timestamp changed and both are present.
    const newCheckIn = data.checkIn !== undefined ? (data.checkIn ? new Date(data.checkIn) : null) : record.checkIn;
    const newCheckOut = data.checkOut !== undefined ? (data.checkOut ? new Date(data.checkOut) : null) : record.checkOut;
    if (data.workingHours !== undefined) {
      updateData.workingHours = data.workingHours;
    } else if (newCheckIn && newCheckOut) {
      const diffHours = (new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 60 * 60);
      updateData.workingHours = diffHours > 0 ? diffHours.toFixed(2) : '0';
    }

    const [updated] = await this.db
      .update(attendanceRecords)
      .set(updateData)
      .where(eq(attendanceRecords.id, id))
      .returning();
    return updated;
  }

  /** Soft-delete an attendance record (HR/admin). */
  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db
      .update(attendanceRecords)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(attendanceRecords.id, id));
    return { message: 'Attendance record deleted' };
  }

  // ─── ESS (Employee Self-Service) ────────────────────────

  /** Today's attendance record for the employee, or null if not yet checked in. */
  async getTodayForEmployee(tenantId: string, employeeId: string) {
    const today = new Date().toISOString().split('T')[0];
    const [record] = await this.db
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
    return record ?? null;
  }

  /** History of attendance records for one employee in a date range. */
  async findMine(
    tenantId: string,
    employeeId: string,
    options?: { from?: string; to?: string; limit?: number; offset?: number },
  ) {
    const conditions = [
      eq(attendanceRecords.tenantId, tenantId),
      eq(attendanceRecords.employeeId, employeeId),
      isNull(attendanceRecords.deletedAt),
    ];
    if (options?.from && options?.to) {
      conditions.push(between(attendanceRecords.date, options.from, options.to));
    }
    return this.db
      .select()
      .from(attendanceRecords)
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.date))
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);
  }

  async getAttendanceSummary(tenantId: string, employeeId: string, options?: { fromDate?: string; toDate?: string }) {
    // Validate employee
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

    // Default to current month
    const now = new Date();
    const fromDate = options?.fromDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const toDate = options?.toDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;

    const records = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.tenantId, tenantId),
          between(attendanceRecords.date, fromDate, toDate),
          isNull(attendanceRecords.deletedAt),
        ),
      )
      .orderBy(desc(attendanceRecords.date));

    const summary = {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      period: { from: fromDate, to: toDate },
      totalDays: records.length,
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      halfDay: records.filter((r) => r.status === 'half_day').length,
      late: records.filter((r) => r.status === 'late').length,
      onLeave: records.filter((r) => r.status === 'on_leave').length,
      totalWorkingHours: records.reduce((sum, r) => {
        return sum + (r.workingHours ? parseFloat(r.workingHours) : 0);
      }, 0),
      records,
    };

    return summary;
  }
}
