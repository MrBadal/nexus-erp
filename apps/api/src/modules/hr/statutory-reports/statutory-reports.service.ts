import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  employees,
  payrollEntries,
  payrollEntryComponents,
  salaryComponents,
} from '../../../database/schema/hr.js';

export interface PfRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  uanNumber: string | null;
  basic: number;
  epf: number;          // 12% (employee)
  eps: number;          // 8.33% of capped basic (out of employer contribution)
  employerEpfTotal: number; // employer 12% (or capped)
}

export interface EsiRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  esicNumber: string | null;
  gross: number;
  employee: number; // 0.75%
  employer: number; // 3.25%
}

export interface PtRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  state: string | null;
  amount: number;
}

export interface TdsRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  panNumber: string | null;
  period: string;
  tds: number;
}

@Injectable()
export class StatutoryReportsService {
  private readonly logger = new Logger(StatutoryReportsService.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ── PF Return ──

  async pfReturn(tenantId: string, fy: string, month: string): Promise<{
    period: string;
    rows: PfRow[];
    totals: { basic: number; epf: number; eps: number; employerEpfTotal: number };
  }> {
    const period = this.fyMonthToPeriod(fy, month);
    const entries = await this.fetchEntriesForPeriod(tenantId, period);

    const rows: PfRow[] = [];
    let tBasic = 0,
      tEpf = 0,
      tEps = 0,
      tEmpEpf = 0;

    for (const entry of entries) {
      const components = await this.fetchComponents(entry.id);
      const basic = sumByCodes(components, ['BASIC', 'BASIC_PAY']);
      const epf = sumByCodes(components, ['EPF_EMPLOYEE']);
      const cappedBasic = Math.min(basic, 15000);
      const eps = Math.round(cappedBasic * 0.0833); // 8.33%
      const employerEpfTotal = parseFloat(entry.employerEpf ?? '0');

      const row: PfRow = {
        employeeId: entry.employeeId,
        employeeCode: entry.employeeCode,
        employeeName: entry.employeeName,
        uanNumber: entry.uanNumber,
        basic,
        epf,
        eps,
        employerEpfTotal,
      };
      rows.push(row);
      tBasic += basic;
      tEpf += epf;
      tEps += eps;
      tEmpEpf += employerEpfTotal;
    }

    return {
      period,
      rows,
      totals: { basic: tBasic, epf: tEpf, eps: tEps, employerEpfTotal: tEmpEpf },
    };
  }

  // ── ESI Return ──

  async esiReturn(tenantId: string, fy: string, month: string): Promise<{
    period: string;
    rows: EsiRow[];
    totals: { gross: number; employee: number; employer: number };
  }> {
    const period = this.fyMonthToPeriod(fy, month);
    const entries = await this.fetchEntriesForPeriod(tenantId, period);

    const rows: EsiRow[] = [];
    let tGross = 0,
      tEmp = 0,
      tEr = 0;

    for (const entry of entries) {
      const gross = parseFloat(entry.grossPay);
      if (gross > 21000) continue;

      const components = await this.fetchComponents(entry.id);
      const employee = sumByCodes(components, ['ESIC_EMPLOYEE']);
      const employer = parseFloat(entry.employerEsic ?? '0');

      const row: EsiRow = {
        employeeId: entry.employeeId,
        employeeCode: entry.employeeCode,
        employeeName: entry.employeeName,
        esicNumber: entry.esicNumber,
        gross,
        employee,
        employer,
      };
      rows.push(row);
      tGross += gross;
      tEmp += employee;
      tEr += employer;
    }

    return {
      period,
      rows,
      totals: { gross: tGross, employee: tEmp, employer: tEr },
    };
  }

  // ── Professional Tax Register ──

  async ptRegister(tenantId: string, fy: string, month: string): Promise<{
    period: string;
    rows: PtRow[];
    byState: Record<string, number>;
    total: number;
  }> {
    const period = this.fyMonthToPeriod(fy, month);
    const entries = await this.fetchEntriesForPeriod(tenantId, period);

    const rows: PtRow[] = [];
    const byState: Record<string, number> = {};
    let total = 0;

    for (const entry of entries) {
      const components = await this.fetchComponents(entry.id);
      const amount = sumByCodes(components, ['PROFESSIONAL_TAX', 'PT']);
      if (amount <= 0) continue;

      const state = entry.pfState ?? entry.state ?? null;
      rows.push({
        employeeId: entry.employeeId,
        employeeCode: entry.employeeCode,
        employeeName: entry.employeeName,
        state,
        amount,
      });

      const key = state ?? 'Unknown';
      byState[key] = (byState[key] ?? 0) + amount;
      total += amount;
    }

    return { period, rows, byState, total };
  }

  // ── TDS Quarterly ──

  async tdsQuarterly(
    tenantId: string,
    fy: string,
    quarter: string,
  ): Promise<{
    fiscalYear: string;
    quarter: string;
    periods: string[];
    rows: TdsRow[];
    totals: { tds: number };
  }> {
    const periods = this.quarterToPeriods(fy, quarter);
    const entries = await this.fetchEntriesForPeriods(tenantId, periods);

    const rows: TdsRow[] = [];
    let total = 0;

    for (const entry of entries) {
      const components = await this.fetchComponents(entry.id);
      const tds = sumByCodes(components, ['TDS']);
      if (tds <= 0) continue;

      rows.push({
        employeeId: entry.employeeId,
        employeeCode: entry.employeeCode,
        employeeName: entry.employeeName,
        panNumber: entry.panNumber,
        period: entry.period,
        tds,
      });
      total += tds;
    }

    return {
      fiscalYear: fy,
      quarter,
      periods,
      rows,
      totals: { tds: total },
    };
  }

  // ── helpers ──

  private fyMonthToPeriod(fy: string, month: string): string {
    const [yearStr] = fy.split('-');
    const startYear = parseInt(yearStr, 10);
    const m = parseInt(month, 10);
    if (Number.isNaN(startYear) || Number.isNaN(m) || m < 1 || m > 12) {
      throw new BadRequestException(`Invalid fiscal year "${fy}" or month "${month}"`);
    }
    // FY runs Apr–Mar: months 4..12 in startYear, 1..3 in startYear+1
    const year = m >= 4 ? startYear : startYear + 1;
    return `${year}-${String(m).padStart(2, '0')}`;
  }

  private quarterToPeriods(fy: string, quarter: string): string[] {
    const q = parseInt(quarter.replace(/[Qq]/, ''), 10);
    if (Number.isNaN(q) || q < 1 || q > 4) {
      throw new BadRequestException(`Invalid quarter "${quarter}" — expected Q1..Q4`);
    }
    // Indian FY: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
    const months = [
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12],
      [1, 2, 3],
    ][q - 1];
    return months.map((m) => this.fyMonthToPeriod(fy, String(m)));
  }

  private async fetchEntriesForPeriod(tenantId: string, period: string) {
    return this.fetchEntriesForPeriods(tenantId, [period]);
  }

  private async fetchEntriesForPeriods(tenantId: string, periods: string[]) {
    return this.db
      .select({
        id: payrollEntries.id,
        employeeId: payrollEntries.employeeId,
        employeeCode: employees.employeeId,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        panNumber: employees.panNumber,
        uanNumber: employees.uanNumber,
        esicNumber: employees.esicNumber,
        pfState: employees.pfState,
        state: employees.state,
        period: payrollEntries.period,
        grossPay: payrollEntries.grossPay,
        employerEpf: payrollEntries.employerEpf,
        employerEsic: payrollEntries.employerEsic,
      })
      .from(payrollEntries)
      .innerJoin(employees, eq(payrollEntries.employeeId, employees.id))
      .where(
        and(
          eq(payrollEntries.tenantId, tenantId),
          isNull(payrollEntries.deletedAt),
          inArray(payrollEntries.period, periods),
        ),
      )
      .then((rows) =>
        rows.map((r) => ({
          ...r,
          employeeName: [r.employeeFirstName, r.employeeLastName].filter(Boolean).join(' '),
        })),
      );
  }

  private async fetchComponents(entryId: string) {
    return this.db
      .select({
        code: salaryComponents.code,
        type: salaryComponents.type,
        amount: payrollEntryComponents.amount,
      })
      .from(payrollEntryComponents)
      .innerJoin(salaryComponents, eq(payrollEntryComponents.componentId, salaryComponents.id))
      .where(eq(payrollEntryComponents.payrollEntryId, entryId));
  }
}

// ── module-private helper ──

function sumByCodes(
  components: { code: string | null; amount: string }[],
  codes: string[],
): number {
  let total = 0;
  for (const c of components) {
    if (!c.code) continue;
    if (codes.includes(c.code.toUpperCase())) {
      total += parseFloat(c.amount);
    }
  }
  return total;
}
