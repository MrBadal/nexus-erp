import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, asc, desc, between, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  salaryStructures,
  salaryComponents,
  salaryStructureComponents,
  payrollEntries,
  payrollEntryComponents,
  employees,
  attendanceRecords,
  leaveApplications,
  leaveTypes,
  taxDeclarations,
  type Employee,
  type NewSalaryStructure,
  type NewSalaryComponent,
  type NewPayrollEntry,
} from '../../../database/schema/index.js';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto.js';
import { CreateSalaryComponentDto } from './dto/create-salary-component.dto.js';
import { ProcessPayrollDto } from './dto/process-payroll.dto.js';
import { EVENTS } from '../../../common/events.constants.js';

// ─── Indian Statutory Constants ──────────────────────────

/** EPF: Employee contributes 12% of Basic (capped at Basic ₹15,000) */
const EPF_EMPLOYEE_RATE = 0.12;
const EPF_BASIC_CEILING = 15000;

/** EPF: Employer contributes 13% of Basic (12% EPF + 1% admin charges) */
const EPF_EMPLOYER_RATE = 0.13;

/** ESIC: Employee 0.75%, Employer 3.25% if gross <= ₹21,000/month */
const ESIC_EMPLOYEE_RATE = 0.0075;
const ESIC_EMPLOYER_RATE = 0.0325;
const ESIC_GROSS_CEILING = 21000;

/** Standard Deduction under new tax regime (effective FY 2024-25) */
const STANDARD_DEDUCTION = 75000;
const STANDARD_DEDUCTION_OLD = 50000;

/** Section 80C cap under old regime */
const SECTION_80C_CAP = 150000;

/** New Regime tax slabs (FY 2024-25 onwards, with ₹75,000 standard deduction) */
const NEW_REGIME_SLABS = [
  { upTo: 400000, rate: 0 },        // 0–4L: nil
  { upTo: 800000, rate: 0.05 },     // 4L–8L: 5%
  { upTo: 1200000, rate: 0.10 },    // 8L–12L: 10%
  { upTo: 1600000, rate: 0.15 },    // 12L–16L: 15%
  { upTo: 2000000, rate: 0.20 },    // 16L–20L: 20%
  { upTo: 2400000, rate: 0.25 },    // 20L–24L: 25%
  { upTo: Infinity, rate: 0.30 },   // >24L: 30%
];

/** Old Regime tax slabs (FY 2024-25) */
const OLD_REGIME_SLABS = [
  { upTo: 250000, rate: 0 },        // 0–2.5L: nil
  { upTo: 500000, rate: 0.05 },     // 2.5L–5L: 5%
  { upTo: 1000000, rate: 0.20 },    // 5L–10L: 20%
  { upTo: Infinity, rate: 0.30 },   // >10L: 30%
];

/** Professional Tax monthly rates by state (if gross > threshold) */
const PROFESSIONAL_TAX_RULES: Record<string, { threshold: number; monthlyAmount: number }> = {
  'Karnataka':    { threshold: 15000, monthlyAmount: 200 },
  'Maharashtra':  { threshold: 10000, monthlyAmount: 200 },
  'Tamil Nadu':   { threshold: 15000, monthlyAmount: 208 },
  'Telangana':    { threshold: 15000, monthlyAmount: 200 },
  'Andhra Pradesh': { threshold: 15000, monthlyAmount: 200 },
  'West Bengal':  { threshold: 10000, monthlyAmount: 200 },
  'Gujarat':      { threshold: 12000, monthlyAmount: 200 },
  'Madhya Pradesh': { threshold: 15000, monthlyAmount: 208 },
  'Kerala':       { threshold: 15000, monthlyAmount: 208 },
};

/** Statutory calculation result */
interface StatutoryResult {
  employeeEpf: number;
  employerEpf: number;
  employeeEsic: number;
  employerEsic: number;
  tds: number;
  professionalTax: number;
  totalStatutoryDeductions: number; // sum of employee-side deductions
}

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Indian Statutory Calculations ─────────────────────

  /**
   * Calculate EPF contribution.
   * Employee: 12% of Basic (capped at Basic ₹15,000).
   * Employer: 13% of Basic (12% EPF + 1% admin).
   */
  private calculateEpf(basicPay: number): { employee: number; employer: number } {
    const cappedBasic = Math.min(basicPay, EPF_BASIC_CEILING);
    return {
      employee: Math.round(cappedBasic * EPF_EMPLOYEE_RATE),
      employer: Math.round(cappedBasic * EPF_EMPLOYER_RATE),
    };
  }

  /**
   * Calculate ESIC contribution.
   * Applicable only if monthly gross <= ₹21,000.
   * Employee: 0.75%, Employer: 3.25%.
   */
  private calculateEsic(grossPay: number): { employee: number; employer: number } {
    if (grossPay > ESIC_GROSS_CEILING) {
      return { employee: 0, employer: 0 };
    }
    return {
      employee: Math.round(grossPay * ESIC_EMPLOYEE_RATE),
      employer: Math.round(grossPay * ESIC_EMPLOYER_RATE),
    };
  }

  /**
   * Calculate monthly TDS based on projected annual income.
   * Applies either New or Old regime slabs.
   * For Old regime, fetches 80C/other declarations for deductions.
   */
  private calculateTds(
    annualGross: number,
    annualEpf: number,
    regime: 'old' | 'new',
    declarations: { section: string; declaredAmount: string }[],
  ): number {
    let taxableIncome = annualGross;

    if (regime === 'new') {
      // New regime: standard deduction ₹75,000
      taxableIncome -= STANDARD_DEDUCTION;
    } else {
      // Old regime: standard deduction ₹50,000
      taxableIncome -= STANDARD_DEDUCTION_OLD;

      // 80C: EPF contribution + other 80C declarations, capped at ₹1,50,000
      let total80C = annualEpf;
      for (const d of declarations) {
        if (d.section === '80C') {
          total80C += parseFloat(d.declaredAmount);
        }
      }
      taxableIncome -= Math.min(total80C, SECTION_80C_CAP);

      // Other sections (80D, 80E, 80G, 80TTA, 80CCD, 24B, HRA, LTA)
      for (const d of declarations) {
        if (d.section !== '80C') {
          taxableIncome -= parseFloat(d.declaredAmount);
        }
      }
    }

    taxableIncome = Math.max(taxableIncome, 0);

    // Apply slabs
    const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
    let annualTax = 0;
    let remaining = taxableIncome;
    let prevLimit = 0;

    for (const slab of slabs) {
      const slabWidth = slab.upTo === Infinity ? remaining : slab.upTo - prevLimit;
      const taxableInSlab = Math.min(remaining, slabWidth);
      annualTax += taxableInSlab * slab.rate;
      remaining -= taxableInSlab;
      prevLimit = slab.upTo;
      if (remaining <= 0) break;
    }

    // 4% Health & Education Cess
    annualTax *= 1.04;

    // Section 87A rebate: if taxable income <= 7L (new) or 5L (old), tax is nil
    const rebateLimit = regime === 'new' ? 700000 : 500000;
    if (taxableIncome <= rebateLimit) {
      annualTax = 0;
    }

    // Monthly TDS
    return Math.round(annualTax / 12);
  }

  /**
   * Calculate Professional Tax based on employee's state.
   * Returns monthly PT amount.
   */
  private calculateProfessionalTax(grossPay: number, state: string | null): number {
    if (!state) return 0;
    const rule = PROFESSIONAL_TAX_RULES[state];
    if (!rule) return 0;
    return grossPay >= rule.threshold ? rule.monthlyAmount : 0;
  }

  /**
   * Full statutory calculation for one employee for one month.
   */
  async calculateStatutoryComponents(
    tenantId: string,
    employee: Employee,
    basicPay: number,
    grossPay: number,
    period: string, // YYYY-MM
  ): Promise<StatutoryResult> {
    const epf = this.calculateEpf(basicPay);
    const esic = this.calculateEsic(grossPay);
    const pt = this.calculateProfessionalTax(grossPay, employee.pfState ?? employee.state ?? null);

    // Fetch tax declarations for the fiscal year (April–March)
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const fiscalYear = month >= 4 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;

    let declarations: { section: string; declaredAmount: string }[] = [];
    const regime = employee.taxRegime ?? 'new';

    if (regime === 'old') {
      declarations = await this.db
        .select({
          section: taxDeclarations.section,
          declaredAmount: taxDeclarations.declaredAmount,
        })
        .from(taxDeclarations)
        .where(
          and(
            eq(taxDeclarations.employeeId, employee.id),
            eq(taxDeclarations.tenantId, tenantId),
            eq(taxDeclarations.fiscalYear, fiscalYear),
            isNull(taxDeclarations.deletedAt),
          ),
        );
    }

    const annualGross = grossPay * 12;
    const annualEpf = epf.employee * 12;
    const tds = this.calculateTds(annualGross, annualEpf, regime, declarations);

    const totalStatutoryDeductions = epf.employee + esic.employee + tds + pt;

    return {
      employeeEpf: epf.employee,
      employerEpf: epf.employer,
      employeeEsic: esic.employee,
      employerEsic: esic.employer,
      tds,
      professionalTax: pt,
      totalStatutoryDeductions,
    };
  }

  // ─── Attendance-Based Proration ────────────────────────

  /**
   * Get attendance data for an employee for a payroll period.
   * Returns working days, present days, and LOP (loss of pay) days.
   */
  async getAttendanceForPeriod(
    tenantId: string,
    employeeId: string,
    period: string, // YYYY-MM
  ): Promise<{ workingDays: number; presentDays: number; lopDays: number }> {
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    // Calculate working days (exclude weekends — Sat/Sun)
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month - 1, d).getDay();
      if (day !== 0 && day !== 6) workingDays++;
    }

    const startDate = `${period}-01`;
    const endDate = `${period}-${daysInMonth.toString().padStart(2, '0')}`;

    // Get attendance records
    const records = await this.db
      .select({ status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.tenantId, tenantId),
          between(attendanceRecords.date, startDate, endDate),
          isNull(attendanceRecords.deletedAt),
        ),
      );

    // Get approved paid leave for the period (these don't count as LOP)
    const approvedPaidLeaves = await this.db
      .select({
        totalDays: leaveApplications.totalDays,
        isPaid: leaveTypes.isPaid,
      })
      .from(leaveApplications)
      .innerJoin(leaveTypes, eq(leaveApplications.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveApplications.employeeId, employeeId),
          eq(leaveApplications.tenantId, tenantId),
          eq(leaveApplications.status, 'approved'),
          // Overlap with period
          sql`${leaveApplications.fromDate} <= ${endDate}`,
          sql`${leaveApplications.toDate} >= ${startDate}`,
        ),
      );

    const paidLeaveDays = approvedPaidLeaves
      .filter((l) => l.isPaid)
      .reduce((sum, l) => sum + l.totalDays, 0);

    // Count present + on_leave + late + half_day
    let presentDays = 0;
    let halfDays = 0;
    for (const r of records) {
      if (r.status === 'present' || r.status === 'late' || r.status === 'on_leave') {
        presentDays++;
      } else if (r.status === 'half_day') {
        halfDays++;
      }
    }

    // Half days count as 0.5 working days
    const effectivePresent = presentDays + halfDays * 0.5;

    // LOP = working days - effective present days - paid leave days
    // If no attendance records exist (no tracking enabled), assume full attendance
    const hasAttendanceData = records.length > 0;
    const lopDays = hasAttendanceData
      ? Math.max(0, Math.round(workingDays - effectivePresent - paidLeaveDays))
      : 0;

    return {
      workingDays,
      presentDays: Math.round(effectivePresent),
      lopDays,
    };
  }

  // ─── Salary Structures ──────────────────────────────────

  async findAllSalaryStructures(tenantId: string) {
    return this.db
      .select()
      .from(salaryStructures)
      .where(
        and(eq(salaryStructures.tenantId, tenantId), isNull(salaryStructures.deletedAt)),
      )
      .orderBy(asc(salaryStructures.name));
  }

  async findSalaryStructureById(tenantId: string, id: string) {
    const [structure] = await this.db
      .select()
      .from(salaryStructures)
      .where(
        and(
          eq(salaryStructures.id, id),
          eq(salaryStructures.tenantId, tenantId),
          isNull(salaryStructures.deletedAt),
        ),
      )
      .limit(1);

    if (!structure) {
      throw new NotFoundException(`Salary structure with ID "${id}" not found`);
    }

    const components = await this.db
      .select({
        id: salaryStructureComponents.id,
        componentId: salaryStructureComponents.componentId,
        componentName: salaryComponents.name,
        componentCode: salaryComponents.code,
        componentType: salaryComponents.type,
        formula: salaryStructureComponents.formula,
        amount: salaryStructureComponents.amount,
        percentage: salaryStructureComponents.percentage,
        basedOn: salaryStructureComponents.basedOn,
      })
      .from(salaryStructureComponents)
      .innerJoin(
        salaryComponents,
        eq(salaryStructureComponents.componentId, salaryComponents.id),
      )
      .where(eq(salaryStructureComponents.structureId, id));

    return { ...structure, components };
  }

  async createSalaryStructure(tenantId: string, data: CreateSalaryStructureDto) {
    const values: NewSalaryStructure = {
      tenantId,
      name: data.name,
      description: data.description || null,
      isActive: data.isActive ?? true,
    };

    // Atomic: structure + components commit together
    const structure = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(salaryStructures)
        .values(values)
        .returning();

      if (data.components && data.components.length > 0) {
        const componentValues = data.components.map((c) => ({
          structureId: created.id,
          componentId: c.componentId,
          formula: c.formula || null,
          amount: c.amount || null,
          percentage: c.percentage || null,
          basedOn: c.basedOn || null,
        }));

        await tx.insert(salaryStructureComponents).values(componentValues);
      }

      return created;
    });

    return this.findSalaryStructureById(tenantId, structure.id);
  }

  // ─── Salary Components ──────────────────────────────────

  async findAllSalaryComponents(tenantId: string) {
    return this.db
      .select()
      .from(salaryComponents)
      .where(
        and(eq(salaryComponents.tenantId, tenantId), isNull(salaryComponents.deletedAt)),
      )
      .orderBy(asc(salaryComponents.name));
  }

  async createSalaryComponent(tenantId: string, data: CreateSalaryComponentDto) {
    const [existing] = await this.db
      .select()
      .from(salaryComponents)
      .where(
        and(
          eq(salaryComponents.code, data.code),
          eq(salaryComponents.tenantId, tenantId),
          isNull(salaryComponents.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Salary component with code "${data.code}" already exists`);
    }

    const values: NewSalaryComponent = {
      tenantId,
      name: data.name,
      code: data.code,
      type: data.type as 'earning' | 'deduction',
      isTaxable: data.isTaxable ?? false,
      isActive: data.isActive ?? true,
      description: data.description || null,
    };

    const [component] = await this.db
      .insert(salaryComponents)
      .values(values)
      .returning();

    return component;
  }

  // ─── Payroll Processing ─────────────────────────────────

  async processPayroll(tenantId: string, data: ProcessPayrollDto) {
    // Get salary structure with components
    const structure = await this.findSalaryStructureById(tenantId, data.salaryStructureId);

    if (!structure.isActive) {
      throw new BadRequestException('Salary structure is not active');
    }

    if (structure.components.length === 0) {
      throw new BadRequestException('Salary structure has no components');
    }

    // Get employees to process
    const conditions = [
      eq(employees.tenantId, tenantId),
      eq(employees.status, 'active'),
      isNull(employees.deletedAt),
    ];

    let employeeList;
    if (data.employeeIds && data.employeeIds.length > 0) {
      // Process only specified employees
      employeeList = [];
      for (const empId of data.employeeIds) {
        const [emp] = await this.db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.id, empId),
              eq(employees.tenantId, tenantId),
              eq(employees.status, 'active'),
              isNull(employees.deletedAt),
            ),
          )
          .limit(1);

        if (!emp) {
          throw new NotFoundException(`Employee with ID "${empId}" not found or not active`);
        }

        employeeList.push(emp);
      }
    } else {
      employeeList = await this.db
        .select()
        .from(employees)
        .where(and(...conditions));
    }

    if (employeeList.length === 0) {
      throw new BadRequestException('No active employees found for payroll processing');
    }

    const createdEntries: string[] = [];
    const skipped: string[] = [];

    for (const emp of employeeList) {
      // Check for existing payroll entry for this period
      const [existingEntry] = await this.db
        .select()
        .from(payrollEntries)
        .where(
          and(
            eq(payrollEntries.employeeId, emp.id),
            eq(payrollEntries.period, data.period),
            eq(payrollEntries.tenantId, tenantId),
            isNull(payrollEntries.deletedAt),
          ),
        )
        .limit(1);

      if (existingEntry) {
        skipped.push(emp.id);
        continue;
      }

      // ── Step 1: Get attendance data for proration ──
      const attendance = await this.getAttendanceForPeriod(tenantId, emp.id, data.period);

      // ── Step 2: Calculate salary components (from structure) ──
      let grossPay = 0;
      let basicPay = 0;

      const entryComponentValues: {
        componentId: string;
        componentCode: string;
        amount: string;
        type: 'earning' | 'deduction';
      }[] = [];

      for (const comp of structure.components) {
        let componentAmount = 0;

        if (comp.amount) {
          componentAmount = parseFloat(comp.amount);
        } else if (comp.percentage && comp.basedOn) {
          const baseComp = entryComponentValues.find(
            (ec) => ec.componentId === comp.basedOn,
          );
          if (baseComp) {
            componentAmount = parseFloat(baseComp.amount) * (parseFloat(comp.percentage) / 100);
          }
        }

        // Apply LOP proration: reduce earnings proportionally
        if (comp.componentType === 'earning' && attendance.lopDays > 0 && attendance.workingDays > 0) {
          const prorationFactor = (attendance.workingDays - attendance.lopDays) / attendance.workingDays;
          componentAmount = Math.round(componentAmount * prorationFactor);
        }

        if (comp.componentType === 'earning') {
          grossPay += componentAmount;
          // Track Basic pay for statutory calculations
          if (comp.componentCode?.toUpperCase() === 'BASIC' || comp.componentCode?.toUpperCase() === 'BASIC_PAY') {
            basicPay = componentAmount;
          }
        }

        entryComponentValues.push({
          componentId: comp.componentId,
          componentCode: comp.componentCode ?? '',
          amount: componentAmount.toFixed(4),
          type: comp.componentType as 'earning' | 'deduction',
        });
      }

      // If no explicit Basic identified, assume 50% of gross (common in Indian payroll)
      if (basicPay === 0) {
        basicPay = grossPay * 0.5;
      }

      // ── Step 3: Calculate statutory deductions ──
      let statutory: StatutoryResult;
      try {
        statutory = await this.calculateStatutoryComponents(
          tenantId,
          emp,
          basicPay,
          grossPay,
          data.period,
        );
      } catch (err) {
        this.logger.warn(`Statutory calculation failed for employee ${emp.id}: ${err}`);
        statutory = {
          employeeEpf: 0, employerEpf: 0,
          employeeEsic: 0, employerEsic: 0,
          tds: 0, professionalTax: 0,
          totalStatutoryDeductions: 0,
        };
      }

      // ── Step 4: Find or create statutory salary components ──
      // These are auto-managed deduction components
      const statutoryItems = [
        { code: 'EPF_EMPLOYEE', name: 'EPF (Employee)', amount: statutory.employeeEpf },
        { code: 'ESIC_EMPLOYEE', name: 'ESIC (Employee)', amount: statutory.employeeEsic },
        { code: 'TDS', name: 'TDS (Income Tax)', amount: statutory.tds },
        { code: 'PROFESSIONAL_TAX', name: 'Professional Tax', amount: statutory.professionalTax },
      ];

      let totalDeductions = 0;
      // Add existing structure deductions
      for (const comp of entryComponentValues) {
        if (comp.type === 'deduction') {
          totalDeductions += parseFloat(comp.amount);
        }
      }

      // Add statutory deduction components
      for (const item of statutoryItems) {
        if (item.amount <= 0) continue;

        // Find or create the salary component
        let [existingComp] = await this.db
          .select()
          .from(salaryComponents)
          .where(
            and(
              eq(salaryComponents.code, item.code),
              eq(salaryComponents.tenantId, tenantId),
              isNull(salaryComponents.deletedAt),
            ),
          )
          .limit(1);

        if (!existingComp) {
          [existingComp] = await this.db
            .insert(salaryComponents)
            .values({
              tenantId,
              name: item.name,
              code: item.code,
              type: 'deduction',
              isTaxable: false,
              isActive: true,
              description: `Auto-created statutory component: ${item.name}`,
            })
            .returning();
        }

        totalDeductions += item.amount;

        entryComponentValues.push({
          componentId: existingComp.id,
          componentCode: item.code,
          amount: item.amount.toFixed(4),
          type: 'deduction',
        });
      }

      // LOP deduction component (if any)
      if (attendance.lopDays > 0 && attendance.workingDays > 0) {
        // LOP is already reflected via proration of earnings above
        // but we track it as a separate line for transparency
        const fullGrossBeforeProration = grossPay / ((attendance.workingDays - attendance.lopDays) / attendance.workingDays);
        const lopDeduction = Math.round(fullGrossBeforeProration - grossPay);

        if (lopDeduction > 0) {
          let [lopComp] = await this.db
            .select()
            .from(salaryComponents)
            .where(
              and(
                eq(salaryComponents.code, 'LOP_DEDUCTION'),
                eq(salaryComponents.tenantId, tenantId),
                isNull(salaryComponents.deletedAt),
              ),
            )
            .limit(1);

          if (!lopComp) {
            [lopComp] = await this.db
              .insert(salaryComponents)
              .values({
                tenantId,
                name: 'Loss of Pay Deduction',
                code: 'LOP_DEDUCTION',
                type: 'deduction',
                isTaxable: false,
                isActive: true,
                description: 'Auto-calculated LOP deduction based on attendance',
              })
              .returning();
          }

          // Note: LOP is already deducted from earnings via proration.
          // This entry is informational (amount=0) to show LOP days on the payslip.
          entryComponentValues.push({
            componentId: lopComp.id,
            componentCode: 'LOP_DEDUCTION',
            amount: '0.0000', // Proration already applied to earnings
            type: 'deduction',
          });
        }
      }

      const netPay = grossPay - totalDeductions;

      const payrollValues: NewPayrollEntry = {
        tenantId,
        employeeId: emp.id,
        period: data.period,
        salaryStructureId: data.salaryStructureId,
        grossPay: grossPay.toFixed(4),
        totalDeductions: totalDeductions.toFixed(4),
        netPay: netPay.toFixed(4),
        employerEpf: statutory.employerEpf.toFixed(4),
        employerEsic: statutory.employerEsic.toFixed(4),
        workingDays: attendance.workingDays,
        presentDays: attendance.presentDays,
        lopDays: attendance.lopDays,
        status: 'draft',
      };

      // Atomic: payroll entry + its components commit together
      const entry = await this.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(payrollEntries)
          .values(payrollValues)
          .returning();

        // Insert payroll entry components
        if (entryComponentValues.length > 0) {
          const componentRows = entryComponentValues.map((c) => ({
            payrollEntryId: created.id,
            componentId: c.componentId,
            amount: c.amount,
            type: c.type,
          }));

          await tx.insert(payrollEntryComponents).values(componentRows);
        }

        return created;
      });

      createdEntries.push(entry.id);
    }

    return {
      message: `Payroll processed for ${createdEntries.length} employees`,
      period: data.period,
      entriesCreated: createdEntries.length,
      skipped: skipped.length,
      entryIds: createdEntries,
    };
  }

  // ─── Payroll Entries ────────────────────────────────────

  async findAllPayrollEntries(
    tenantId: string,
    options?: { period?: string; status?: string; employeeId?: string; limit?: number; offset?: number },
  ) {
    const conditions = [
      eq(payrollEntries.tenantId, tenantId),
      isNull(payrollEntries.deletedAt),
    ];

    if (options?.period) {
      conditions.push(eq(payrollEntries.period, options.period));
    }

    if (options?.status) {
      conditions.push(
        eq(payrollEntries.status, options.status as 'draft' | 'submitted' | 'approved' | 'paid'),
      );
    }

    if (options?.employeeId) {
      conditions.push(eq(payrollEntries.employeeId, options.employeeId));
    }

    return this.db
      .select()
      .from(payrollEntries)
      .where(and(...conditions))
      .orderBy(desc(payrollEntries.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findPayrollEntryById(tenantId: string, id: string) {
    const [entry] = await this.db
      .select()
      .from(payrollEntries)
      .where(
        and(
          eq(payrollEntries.id, id),
          eq(payrollEntries.tenantId, tenantId),
          isNull(payrollEntries.deletedAt),
        ),
      )
      .limit(1);

    if (!entry) {
      throw new NotFoundException(`Payroll entry with ID "${id}" not found`);
    }

    const components = await this.db
      .select({
        id: payrollEntryComponents.id,
        componentId: payrollEntryComponents.componentId,
        componentName: salaryComponents.name,
        componentCode: salaryComponents.code,
        amount: payrollEntryComponents.amount,
        type: payrollEntryComponents.type,
      })
      .from(payrollEntryComponents)
      .innerJoin(
        salaryComponents,
        eq(payrollEntryComponents.componentId, salaryComponents.id),
      )
      .where(eq(payrollEntryComponents.payrollEntryId, id));

    return { ...entry, components };
  }

  /** ESS-scoped fetch of one payroll entry — verifies ownership. */
  async findMyPayrollEntryById(tenantId: string, employeeId: string, id: string) {
    const [entry] = await this.db
      .select()
      .from(payrollEntries)
      .where(
        and(
          eq(payrollEntries.id, id),
          eq(payrollEntries.tenantId, tenantId),
          eq(payrollEntries.employeeId, employeeId),
          isNull(payrollEntries.deletedAt),
        ),
      )
      .limit(1);

    if (!entry) {
      throw new NotFoundException('Payroll entry not found for this employee');
    }

    const components = await this.db
      .select({
        id: payrollEntryComponents.id,
        componentId: payrollEntryComponents.componentId,
        componentName: salaryComponents.name,
        componentCode: salaryComponents.code,
        amount: payrollEntryComponents.amount,
        type: payrollEntryComponents.type,
      })
      .from(payrollEntryComponents)
      .innerJoin(
        salaryComponents,
        eq(payrollEntryComponents.componentId, salaryComponents.id),
      )
      .where(eq(payrollEntryComponents.payrollEntryId, id));

    return { ...entry, components };
  }

  async approvePayrollEntry(tenantId: string, id: string) {
    const [entry] = await this.db
      .select()
      .from(payrollEntries)
      .where(
        and(
          eq(payrollEntries.id, id),
          eq(payrollEntries.tenantId, tenantId),
          isNull(payrollEntries.deletedAt),
        ),
      )
      .limit(1);

    if (!entry) {
      throw new NotFoundException(`Payroll entry with ID "${id}" not found`);
    }

    if (entry.status !== 'draft' && entry.status !== 'submitted') {
      throw new BadRequestException(
        `Cannot approve payroll entry with status "${entry.status}"`,
      );
    }

    const [updated] = await this.db
      .update(payrollEntries)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(payrollEntries.id, id))
      .returning();

    // Load components for the GL journal
    const components = await this.db
      .select({
        componentCode: salaryComponents.code,
        componentType: salaryComponents.type,
        amount: payrollEntryComponents.amount,
      })
      .from(payrollEntryComponents)
      .innerJoin(
        salaryComponents,
        eq(payrollEntryComponents.componentId, salaryComponents.id),
      )
      .where(eq(payrollEntryComponents.payrollEntryId, id));

    // Emit event → IntegrationService will post the payroll GL journal
    this.eventEmitter.emit(EVENTS.PAYROLL_ENTRY_APPROVED, {
      entryId: id,
      tenantId,
      employeeId: entry.employeeId,
      period: entry.period,
      grossPay: entry.grossPay,
      totalDeductions: entry.totalDeductions,
      netPay: entry.netPay,
      components,
    });

    // Notify employee that their payslip is available
    this.eventEmitter.emit('hr.payslip.published', {
      tenantId,
      employeeId: entry.employeeId,
      period: entry.period,
      netPay: entry.netPay,
    });

    return updated;
  }

  // ─── Edit / Pay / Void / Delete ─────────────────────────

  private async loadEntry(tenantId: string, id: string) {
    const [entry] = await this.db
      .select()
      .from(payrollEntries)
      .where(
        and(
          eq(payrollEntries.id, id),
          eq(payrollEntries.tenantId, tenantId),
          isNull(payrollEntries.deletedAt),
        ),
      )
      .limit(1);
    if (!entry) {
      throw new NotFoundException(`Payroll entry with ID "${id}" not found`);
    }
    return entry;
  }

  /**
   * Edit the adjustable fields of a payroll entry before it is finalised.
   * HR may edit draft/submitted; admin may additionally edit an approved
   * entry (but not a paid one — void it first). Editing recomputes nothing
   * deep; it adjusts the stored figures HR provides (e.g. correcting LOP).
   */
  async updateEntry(
    tenantId: string,
    id: string,
    data: Partial<{
      grossPay: string;
      totalDeductions: string;
      netPay: string;
      workingDays: number;
      presentDays: number;
      lopDays: string;
      paymentMethod: string;
    }>,
    isAdmin: boolean,
  ) {
    const entry = await this.loadEntry(tenantId, id);

    const editableByHr = entry.status === 'draft' || entry.status === 'submitted';
    const editableByAdmin = editableByHr || entry.status === 'approved';
    if (!(isAdmin ? editableByAdmin : editableByHr)) {
      throw new BadRequestException(
        `Cannot edit a payroll entry with status "${entry.status}". Void it first to make changes.`,
      );
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of ['grossPay', 'totalDeductions', 'netPay', 'lopDays', 'paymentMethod'] as const) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    if (data.workingDays !== undefined) patch.workingDays = data.workingDays;
    if (data.presentDays !== undefined) patch.presentDays = data.presentDays;

    const [updated] = await this.db
      .update(payrollEntries)
      .set(patch)
      .where(eq(payrollEntries.id, id))
      .returning();
    return updated;
  }

  /** Mark an approved payroll entry as paid. */
  async payEntry(
    tenantId: string,
    id: string,
    paymentMethod?: 'bank_transfer' | 'check' | 'cash',
  ) {
    const entry = await this.loadEntry(tenantId, id);
    if (entry.status !== 'approved') {
      throw new BadRequestException(
        `Only an approved payroll entry can be marked paid (current status: ${entry.status})`,
      );
    }
    const [updated] = await this.db
      .update(payrollEntries)
      .set({
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod ?? entry.paymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(payrollEntries.id, id))
      .returning();
    return updated;
  }

  /**
   * Void an approved or paid payroll entry. Emits PAYROLL_ENTRY_VOIDED so the
   * IntegrationService reverses the posted GL journal, then resets the entry to
   * draft and unlinks the journal so it can be corrected and re-approved.
   */
  async voidEntry(tenantId: string, id: string) {
    const entry = await this.loadEntry(tenantId, id);
    if (entry.status !== 'approved' && entry.status !== 'paid') {
      throw new BadRequestException(
        `Only an approved or paid payroll entry can be voided (current status: ${entry.status})`,
      );
    }

    const journalEntryId = (entry as { journalEntryId?: string | null }).journalEntryId ?? null;

    const [updated] = await this.db
      .update(payrollEntries)
      .set({
        status: 'draft',
        journalEntryId: null,
        paidDate: null,
        updatedAt: new Date(),
      } as Record<string, unknown>)
      .where(eq(payrollEntries.id, id))
      .returning();

    if (journalEntryId) {
      this.eventEmitter.emit(EVENTS.PAYROLL_ENTRY_VOIDED, {
        tenantId,
        entryId: id,
        journalEntryId,
        period: entry.period,
      });
    }

    return updated;
  }

  /** Soft-delete a payroll entry. Only draft/submitted; void a posted one first. */
  async softDeleteEntry(tenantId: string, id: string, isAdmin: boolean) {
    const entry = await this.loadEntry(tenantId, id);
    const deletable = entry.status === 'draft' || entry.status === 'submitted';
    if (!deletable) {
      throw new BadRequestException(
        `Cannot delete a payroll entry with status "${entry.status}". Void it first.`,
      );
    }
    // isAdmin reserved for future finer control; both HR (hr:delete) and admin reach here.
    void isAdmin;
    await this.db
      .update(payrollEntries)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(payrollEntries.id, id));
    return { message: 'Payroll entry deleted' };
  }
}
