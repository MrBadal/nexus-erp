import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  employees,
  payrollEntries,
  payrollEntryComponents,
  salaryComponents,
  type Employee,
} from '../../../database/schema/hr.js';
import {
  gratuityProvisions,
  type NewGratuityProvision,
} from '../../../database/schema/hr-statutory.js';

const ELIGIBILITY_YEARS = 5;

export interface ComputedProvision {
  employeeId: string;
  fiscalYear: string;
  lastBasic: number;
  completedYears: number;
  gratuityAmount: number;
  eligible: boolean;
}

@Injectable()
export class GratuityService {
  private readonly logger = new Logger(GratuityService.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  /**
   * Compute gratuity provision for one employee for a fiscal year.
   * Formula: (lastBasic × 15 ÷ 26) × completedYears.
   * Eligible only when completedYears >= 5.
   */
  async computeProvision(
    tenantId: string,
    employeeId: string,
    fiscalYear: string,
  ): Promise<ComputedProvision> {
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
      throw new NotFoundException(`Employee with ID "${employeeId}" not found`);
    }

    return this.computeForEmployee(tenantId, employee, fiscalYear);
  }

  /**
   * Compute gratuity for any active employee whose tenure >= ELIGIBILITY_YEARS,
   * persist the row, and return a summary. Skips already-provisioned (tenant,
   * employee, fy) combinations.
   */
  async provisionAllEligible(
    tenantId: string,
    fiscalYear: string,
  ): Promise<{ created: number; skipped: number; ineligible: number; provisions: string[] }> {
    const list = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.status, 'active'),
          isNull(employees.deletedAt),
        ),
      );

    const provisionIds: string[] = [];
    let skipped = 0;
    let ineligible = 0;

    for (const emp of list) {
      const computed = await this.computeForEmployee(tenantId, emp, fiscalYear);

      if (!computed.eligible) {
        ineligible++;
        continue;
      }

      const [existing] = await this.db
        .select({ id: gratuityProvisions.id })
        .from(gratuityProvisions)
        .where(
          and(
            eq(gratuityProvisions.tenantId, tenantId),
            eq(gratuityProvisions.employeeId, emp.id),
            eq(gratuityProvisions.fiscalYear, fiscalYear),
          ),
        )
        .limit(1);

      if (existing) {
        skipped++;
        continue;
      }

      const values: NewGratuityProvision = {
        tenantId,
        employeeId: emp.id,
        fiscalYear,
        lastBasic: computed.lastBasic.toFixed(4),
        completedYears: computed.completedYears.toFixed(2),
        gratuityAmount: computed.gratuityAmount.toFixed(4),
      };

      const [row] = await this.db
        .insert(gratuityProvisions)
        .values(values)
        .returning({ id: gratuityProvisions.id });

      provisionIds.push(row.id);
    }

    return {
      created: provisionIds.length,
      skipped,
      ineligible,
      provisions: provisionIds,
    };
  }

  /**
   * List provisions for a tenant, optionally filtered by FY.
   */
  async listProvisions(tenantId: string, fiscalYear?: string) {
    const conditions = [eq(gratuityProvisions.tenantId, tenantId)];
    if (fiscalYear) {
      conditions.push(eq(gratuityProvisions.fiscalYear, fiscalYear));
    }

    const rows = await this.db
      .select({
        id: gratuityProvisions.id,
        employeeId: gratuityProvisions.employeeId,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        employeeCode: employees.employeeId,
        fiscalYear: gratuityProvisions.fiscalYear,
        lastBasic: gratuityProvisions.lastBasic,
        completedYears: gratuityProvisions.completedYears,
        gratuityAmount: gratuityProvisions.gratuityAmount,
        providedAt: gratuityProvisions.providedAt,
      })
      .from(gratuityProvisions)
      .leftJoin(employees, eq(gratuityProvisions.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(gratuityProvisions.providedAt));

    return rows.map((r) => ({
      ...r,
      employeeName: [r.employeeFirstName, r.employeeLastName].filter(Boolean).join(' '),
    }));
  }

  // ── helpers ──

  private async computeForEmployee(
    tenantId: string,
    employee: Employee,
    fiscalYear: string,
  ): Promise<ComputedProvision> {
    const completedYears = this.completedYearsAt(employee.dateOfJoining, fiscalYear);
    const lastBasic = await this.fetchLastBasic(tenantId, employee.id);

    const eligible = completedYears >= ELIGIBILITY_YEARS;
    const gratuityAmount = eligible
      ? Math.round(((lastBasic * 15) / 26) * completedYears * 100) / 100
      : 0;

    return {
      employeeId: employee.id,
      fiscalYear,
      lastBasic,
      completedYears: Math.round(completedYears * 100) / 100,
      gratuityAmount,
      eligible,
    };
  }

  /**
   * Years between dateOfJoining and the fiscal-year end (March 31, endYear).
   */
  private completedYearsAt(dateOfJoining: string | null, fiscalYear: string): number {
    if (!dateOfJoining) return 0;
    const [yearStr] = fiscalYear.split('-');
    const startYear = parseInt(yearStr, 10);
    if (Number.isNaN(startYear)) return 0;

    const endOfFy = new Date(Date.UTC(startYear + 1, 2, 31)); // March 31 (UTC), month index 2
    const start = new Date(dateOfJoining);
    if (Number.isNaN(start.getTime())) return 0;
    if (endOfFy < start) return 0;

    const diffMs = endOfFy.getTime() - start.getTime();
    const yearMs = 365.25 * 24 * 60 * 60 * 1000;
    return diffMs / yearMs;
  }

  /**
   * Pull the most recent BASIC component amount from any payroll entry for
   * this employee. Falls back to 0 if none found.
   */
  private async fetchLastBasic(tenantId: string, employeeId: string): Promise<number> {
    const [row] = await this.db
      .select({
        amount: payrollEntryComponents.amount,
      })
      .from(payrollEntryComponents)
      .innerJoin(
        payrollEntries,
        eq(payrollEntryComponents.payrollEntryId, payrollEntries.id),
      )
      .innerJoin(
        salaryComponents,
        eq(payrollEntryComponents.componentId, salaryComponents.id),
      )
      .where(
        and(
          eq(payrollEntries.tenantId, tenantId),
          eq(payrollEntries.employeeId, employeeId),
          isNull(payrollEntries.deletedAt),
          sql`UPPER(${salaryComponents.code}) IN ('BASIC', 'BASIC_PAY')`,
        ),
      )
      .orderBy(desc(payrollEntries.period))
      .limit(1);

    return row ? parseFloat(row.amount) : 0;
  }
}
