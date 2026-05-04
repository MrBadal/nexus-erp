import { Injectable, Inject } from '@nestjs/common';
import { eq, and, isNull, sql, gte, lte } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  employees,
  departments,
  leaveApplications,
  attendanceRecords,
  expenseClaims,
  jobOpenings,
  candidates,
} from '../../../database/schema/hr.js';

export interface HrDashboardData {
  totalActiveEmployees: number;
  onLeaveToday: number;
  attendancePctCurrentMonth: number;
  pendingLeaveApprovals: number;
  pendingExpenseApprovals: number;
  pendingRegularizationRequests: number;
  upcomingBirthdays: Array<{
    id: string;
    name: string;
    dateOfBirth: string | null;
    department: string | null;
    daysUntil: number;
  }>;
  upcomingWorkAnniversaries: Array<{
    id: string;
    name: string;
    dateOfJoining: string;
    department: string | null;
    yearsCompleted: number;
    daysUntil: number;
  }>;
  openJobOpenings: Array<{
    id: string;
    title: string;
    department: string | null;
    positions: number;
    filledPositions: number;
    applicantCount: number;
  }>;
  newHiresLast30Days: number;
  exitsLast30Days: number;
  genderRatio: { male: number; female: number; other: number; unspecified: number };
  departmentDistribution: Array<{
    departmentId: string | null;
    name: string;
    count: number;
  }>;
}

@Injectable()
export class HrDashboardService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async getDashboard(tenantId: string): Promise<HrDashboardData> {
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0]!;

    // Compute current month range
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthStartIso = monthStart.toISOString().split('T')[0]!;
    const monthEndIso = monthEnd.toISOString().split('T')[0]!;

    // 30-day window
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString().split('T')[0]!;

    // 7-day window for upcoming birthdays / anniversaries (based on month-day)
    const sevenDaysAhead = new Date(today);
    sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

    const [
      activeEmpRow,
      onLeaveRow,
      attendanceRow,
      pendingLeaveRow,
      pendingExpenseRow,
      newHiresRow,
      exitsRow,
      genderRows,
      departmentRows,
      birthdayRows,
      anniversaryRows,
      openJobRows,
      applicantCounts,
    ] = await Promise.all([
      this.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            isNull(employees.deletedAt),
            eq(employees.status, 'active'),
          ),
        ),
      this.db
        .select({ count: sql<number>`COUNT(DISTINCT ${leaveApplications.employeeId})::int` })
        .from(leaveApplications)
        .where(
          and(
            eq(leaveApplications.tenantId, tenantId),
            isNull(leaveApplications.deletedAt),
            eq(leaveApplications.status, 'approved'),
            lte(leaveApplications.fromDate, todayIso),
            gte(leaveApplications.toDate, todayIso),
          ),
        ),
      this.db
        .select({
          present: sql<number>`COALESCE(SUM(CASE WHEN ${attendanceRecords.status} IN ('present','half_day','late') THEN 1 ELSE 0 END), 0)::int`,
          total: sql<number>`COUNT(*)::int`,
        })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.tenantId, tenantId),
            isNull(attendanceRecords.deletedAt),
            gte(attendanceRecords.date, monthStartIso),
            lte(attendanceRecords.date, monthEndIso),
          ),
        ),
      this.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(leaveApplications)
        .where(
          and(
            eq(leaveApplications.tenantId, tenantId),
            isNull(leaveApplications.deletedAt),
            eq(leaveApplications.status, 'pending'),
          ),
        ),
      this.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(expenseClaims)
        .where(
          and(
            eq(expenseClaims.tenantId, tenantId),
            isNull(expenseClaims.deletedAt),
            eq(expenseClaims.status, 'submitted'),
          ),
        ),
      this.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            isNull(employees.deletedAt),
            gte(employees.dateOfJoining, thirtyDaysAgoIso),
          ),
        ),
      this.db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            isNull(employees.deletedAt),
            sql`${employees.dateOfLeaving} IS NOT NULL`,
            gte(employees.dateOfLeaving, thirtyDaysAgoIso),
          ),
        ),
      this.db
        .select({
          gender: employees.gender,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            isNull(employees.deletedAt),
            eq(employees.status, 'active'),
          ),
        )
        .groupBy(employees.gender),
      this.db
        .select({
          departmentId: employees.departmentId,
          name: departments.name,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(
          and(
            eq(employees.tenantId, tenantId),
            isNull(employees.deletedAt),
            eq(employees.status, 'active'),
          ),
        )
        .groupBy(employees.departmentId, departments.name),
      this.db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          dateOfBirth: employees.dateOfBirth,
          departmentName: departments.name,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(
          and(
            eq(employees.tenantId, tenantId),
            isNull(employees.deletedAt),
            eq(employees.status, 'active'),
            sql`${employees.dateOfBirth} IS NOT NULL`,
          ),
        ),
      this.db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          dateOfJoining: employees.dateOfJoining,
          departmentName: departments.name,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(
          and(
            eq(employees.tenantId, tenantId),
            isNull(employees.deletedAt),
            eq(employees.status, 'active'),
          ),
        ),
      this.db
        .select({
          id: jobOpenings.id,
          title: jobOpenings.title,
          positions: jobOpenings.positions,
          filledPositions: jobOpenings.filledPositions,
          departmentName: departments.name,
        })
        .from(jobOpenings)
        .leftJoin(departments, eq(jobOpenings.departmentId, departments.id))
        .where(
          and(
            eq(jobOpenings.tenantId, tenantId),
            isNull(jobOpenings.deletedAt),
            eq(jobOpenings.status, 'open'),
          ),
        ),
      this.db
        .select({
          jobOpeningId: candidates.jobOpeningId,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(candidates)
        .where(
          and(
            eq(candidates.tenantId, tenantId),
            isNull(candidates.deletedAt),
          ),
        )
        .groupBy(candidates.jobOpeningId),
    ]);

    const totalActiveEmployees = activeEmpRow[0]?.count ?? 0;
    const onLeaveToday = onLeaveRow[0]?.count ?? 0;
    const attendanceTotal = attendanceRow[0]?.total ?? 0;
    const attendancePresent = attendanceRow[0]?.present ?? 0;
    const attendancePctCurrentMonth =
      attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : 0;
    const pendingLeaveApprovals = pendingLeaveRow[0]?.count ?? 0;
    const pendingExpenseApprovals = pendingExpenseRow[0]?.count ?? 0;
    // Attendance schema does not currently have a regularization status field
    const pendingRegularizationRequests = 0;
    const newHiresLast30Days = newHiresRow[0]?.count ?? 0;
    const exitsLast30Days = exitsRow[0]?.count ?? 0;

    const genderRatio = { male: 0, female: 0, other: 0, unspecified: 0 };
    for (const row of genderRows) {
      if (row.gender === 'male') genderRatio.male = row.count;
      else if (row.gender === 'female') genderRatio.female = row.count;
      else if (row.gender === 'other') genderRatio.other = row.count;
      else genderRatio.unspecified += row.count;
    }

    const departmentDistribution = departmentRows.map((d) => ({
      departmentId: d.departmentId,
      name: d.name ?? 'Unassigned',
      count: d.count,
    }));

    // Compute upcoming birthdays in JS (next 7 days inclusive)
    const upcomingBirthdays = birthdayRows
      .map((row) => {
        if (!row.dateOfBirth) return null;
        const daysUntil = this.daysUntilNextOccurrence(row.dateOfBirth, today);
        if (daysUntil === null || daysUntil > 7) return null;
        return {
          id: row.id,
          name: `${row.firstName} ${row.lastName}`.trim(),
          dateOfBirth: row.dateOfBirth,
          department: row.departmentName,
          daysUntil,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const upcomingWorkAnniversaries = anniversaryRows
      .map((row) => {
        if (!row.dateOfJoining) return null;
        const daysUntil = this.daysUntilNextOccurrence(row.dateOfJoining, today);
        if (daysUntil === null || daysUntil > 7) return null;
        const joining = new Date(row.dateOfJoining);
        // Years completed at next occurrence
        const nextOccurrenceYear =
          today.getFullYear() +
          (today.getMonth() > joining.getMonth() ||
          (today.getMonth() === joining.getMonth() && today.getDate() > joining.getDate())
            ? 1
            : 0);
        const yearsCompleted = nextOccurrenceYear - joining.getFullYear();
        if (yearsCompleted <= 0) return null; // skip same-year joiners
        return {
          id: row.id,
          name: `${row.firstName} ${row.lastName}`.trim(),
          dateOfJoining: row.dateOfJoining,
          department: row.departmentName,
          yearsCompleted,
          daysUntil,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const applicantCountMap = new Map<string, number>();
    for (const row of applicantCounts) {
      applicantCountMap.set(row.jobOpeningId, row.count);
    }

    const openJobOpenings = openJobRows.map((row) => ({
      id: row.id,
      title: row.title,
      department: row.departmentName,
      positions: row.positions,
      filledPositions: row.filledPositions,
      applicantCount: applicantCountMap.get(row.id) ?? 0,
    }));

    return {
      totalActiveEmployees,
      onLeaveToday,
      attendancePctCurrentMonth,
      pendingLeaveApprovals,
      pendingExpenseApprovals,
      pendingRegularizationRequests,
      upcomingBirthdays,
      upcomingWorkAnniversaries,
      openJobOpenings,
      newHiresLast30Days,
      exitsLast30Days,
      genderRatio,
      departmentDistribution,
    };
  }

  /**
   * Returns the number of days until the next occurrence of the given date's
   * month-day (recurring annually). 0 means today, 1 means tomorrow, etc.
   * Returns null if the input is invalid.
   */
  private daysUntilNextOccurrence(isoDate: string, today: Date): number | null {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return null;
    const month = parsed.getMonth();
    const day = parsed.getDate();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let nextOccurrence = new Date(today.getFullYear(), month, day);
    if (nextOccurrence < todayStart) {
      nextOccurrence = new Date(today.getFullYear() + 1, month, day);
    }
    const diffMs = nextOccurrence.getTime() - todayStart.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }
}
