import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, asc, between } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  attendancePolicies,
  type NewAttendancePolicy,
} from '../../../database/schema/hr-shifts.js';
import { attendanceRecords } from '../../../database/schema/hr.js';
import { CreateAttendancePolicyDto } from './dto/create-attendance-policy.dto.js';
import { UpdateAttendancePolicyDto } from './dto/update-attendance-policy.dto.js';
import { ShiftService } from '../shift/shift.service.js';

export interface LateDeductionResult {
  lateInstances: number;
  deductibleInstances: number;
  deductionAmount: number;
  policyId: string | null;
  policyName: string | null;
  details: Array<{
    date: string;
    checkInMinutes: number;
    shiftStartMinutes: number;
    minutesLate: number;
    isLate: boolean;
    isDeductible: boolean;
  }>;
}

@Injectable()
export class AttendancePolicyService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly shiftService: ShiftService,
  ) {}

  // ─── CRUD ───────────────────────────────────────────────

  async findAll(tenantId: string) {
    return this.db
      .select()
      .from(attendancePolicies)
      .where(eq(attendancePolicies.tenantId, tenantId))
      .orderBy(asc(attendancePolicies.name));
  }

  async findActive(tenantId: string) {
    const [policy] = await this.db
      .select()
      .from(attendancePolicies)
      .where(
        and(
          eq(attendancePolicies.tenantId, tenantId),
          eq(attendancePolicies.isActive, true),
        ),
      )
      .limit(1);

    return policy ?? null;
  }

  async findById(tenantId: string, id: string) {
    const [policy] = await this.db
      .select()
      .from(attendancePolicies)
      .where(
        and(eq(attendancePolicies.id, id), eq(attendancePolicies.tenantId, tenantId)),
      )
      .limit(1);

    if (!policy) {
      throw new NotFoundException(`Attendance policy with ID "${id}" not found`);
    }

    return policy;
  }

  async create(tenantId: string, data: CreateAttendancePolicyDto) {
    // If this policy is active, deactivate any other active policy first.
    const isActive = data.isActive ?? true;

    if (isActive) {
      await this.db
        .update(attendancePolicies)
        .set({ isActive: false })
        .where(
          and(
            eq(attendancePolicies.tenantId, tenantId),
            eq(attendancePolicies.isActive, true),
          ),
        );
    }

    const values: NewAttendancePolicy = {
      tenantId,
      name: data.name,
      graceMinutes: data.graceMinutes ?? 15,
      lateThresholdMinutes: data.lateThresholdMinutes ?? 30,
      deductionPerInstance: data.deductionPerInstance ?? '0',
      monthlyToleranceCount: data.monthlyToleranceCount ?? 3,
      isActive,
    };

    const [policy] = await this.db.insert(attendancePolicies).values(values).returning();
    return policy;
  }

  async update(tenantId: string, id: string, data: UpdateAttendancePolicyDto) {
    await this.findById(tenantId, id);

    // If activating this policy, deactivate others
    if (data.isActive === true) {
      await this.db
        .update(attendancePolicies)
        .set({ isActive: false })
        .where(
          and(
            eq(attendancePolicies.tenantId, tenantId),
            eq(attendancePolicies.isActive, true),
          ),
        );
    }

    const updateData: Partial<NewAttendancePolicy> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.graceMinutes !== undefined) updateData.graceMinutes = data.graceMinutes;
    if (data.lateThresholdMinutes !== undefined)
      updateData.lateThresholdMinutes = data.lateThresholdMinutes;
    if (data.deductionPerInstance !== undefined)
      updateData.deductionPerInstance = data.deductionPerInstance;
    if (data.monthlyToleranceCount !== undefined)
      updateData.monthlyToleranceCount = data.monthlyToleranceCount;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await this.db
      .update(attendancePolicies)
      .set(updateData)
      .where(eq(attendancePolicies.id, id))
      .returning();

    return updated;
  }

  // ─── Late Deduction Computation ─────────────────────────

  async computeLateDeductionsForMonth(
    tenantId: string,
    employeeId: string,
    year: number,
    month: number,
  ): Promise<LateDeductionResult> {
    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }

    const policy = await this.findActive(tenantId);

    if (!policy) {
      return {
        lateInstances: 0,
        deductibleInstances: 0,
        deductionAmount: 0,
        policyId: null,
        policyName: null,
        details: [],
      };
    }

    const monthStr = month.toString().padStart(2, '0');
    const fromDate = `${year}-${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${monthStr}-${lastDay.toString().padStart(2, '0')}`;

    // Fetch attendance records for the employee for the month
    const records = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.employeeId, employeeId),
          between(attendanceRecords.date, fromDate, toDate),
          isNull(attendanceRecords.deletedAt),
        ),
      );

    const details: LateDeductionResult['details'] = [];
    let lateInstances = 0;

    for (const rec of records) {
      if (!rec.checkIn) continue;

      const shift = await this.shiftService.getActiveShiftForEmployee(employeeId, rec.date);
      if (!shift) continue;

      const checkInDate = new Date(rec.checkIn);
      const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();

      const [shStartH, shStartM] = shift.startTime.split(':').map((p) => parseInt(p, 10));
      const shiftStartMinutes = shStartH * 60 + shStartM;

      const minutesLate = checkInMinutes - shiftStartMinutes;

      // Late if past (start + grace) AND within (start + lateThreshold)
      // We treat anything past graceMinutes as late, anything past lateThresholdMinutes
      // as severely late (still counts as one instance).
      const isLate = minutesLate > policy.graceMinutes;

      details.push({
        date: rec.date,
        checkInMinutes,
        shiftStartMinutes,
        minutesLate,
        isLate,
        isDeductible: false,
      });

      if (isLate) lateInstances += 1;
    }

    // Sort late instances by date so the first N (tolerance) are forgiven
    const lateDetails = details.filter((d) => d.isLate).sort((a, b) => a.date.localeCompare(b.date));
    const tolerance = policy.monthlyToleranceCount;
    const deductibleInstances = Math.max(0, lateInstances - tolerance);

    // Mark which late records are deductible (those past the tolerance)
    for (let i = tolerance; i < lateDetails.length; i++) {
      const target = details.find((d) => d.date === lateDetails[i].date);
      if (target) target.isDeductible = true;
    }

    const perInstance = parseFloat(policy.deductionPerInstance);
    const deductionAmount = deductibleInstances * (Number.isFinite(perInstance) ? perInstance : 0);

    return {
      lateInstances,
      deductibleInstances,
      deductionAmount,
      policyId: policy.id,
      policyName: policy.name,
      details,
    };
  }
}
