import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { eq, and, isNull, like, sql } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  employees,
  payrollEntries,
  payrollEntryComponents,
  salaryComponents,
  taxDeclarations,
  type Employee,
} from '../../../database/schema/hr.js';

/**
 * Aggregated salary breakdown for Form 16 Part B.
 */
interface Form16Aggregate {
  grossSalary: number;
  basicWages: number;
  hra: number;
  otherAllowances: number;
  totalEarnings: number;
  // Deductions
  totalEpf: number;
  totalEsic: number;
  totalProfessionalTax: number;
  totalTds: number;
  // Other 80C / 80D from declarations
  section80C: number;
  section80D: number;
  otherDeductions: number;
  // Computed
  taxableIncome: number;
}

@Injectable()
export class Form16Service {
  private readonly logger = new Logger(Form16Service.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  /**
   * Generate Form 16 PDF for a single employee for the given fiscal year.
   * Returns a Buffer of the PDF content.
   */
  async generate(tenantId: string, employeeId: string, fiscalYear: string): Promise<Buffer> {
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

    const aggregate = await this.aggregateForFy(tenantId, employeeId, fiscalYear);
    return this.renderPdf(employee, fiscalYear, aggregate);
  }

  /**
   * Aggregate payroll-entry components and tax declarations for the given FY.
   * Indian FY runs April–March; we match on `period` LIKE 'YYYY-MM' for the
   * 12 months Apr (year)–Mar (year+1).
   */
  private async aggregateForFy(
    tenantId: string,
    employeeId: string,
    fiscalYear: string,
  ): Promise<Form16Aggregate> {
    // fiscalYear shape "YYYY-YY" → start year = first 4 digits
    const [yearStr] = fiscalYear.split('-');
    const startYear = parseInt(yearStr, 10);
    if (Number.isNaN(startYear)) {
      throw new NotFoundException(`Invalid fiscal year "${fiscalYear}" — expected "YYYY-YY"`);
    }
    const endYear = startYear + 1;

    // Months: Apr–Dec of startYear, Jan–Mar of endYear
    const periods: string[] = [];
    for (let m = 4; m <= 12; m++) periods.push(`${startYear}-${String(m).padStart(2, '0')}`);
    for (let m = 1; m <= 3; m++) periods.push(`${endYear}-${String(m).padStart(2, '0')}`);

    // Pull all approved/paid payroll entries for these periods
    const entries = await this.db
      .select({
        id: payrollEntries.id,
        period: payrollEntries.period,
        grossPay: payrollEntries.grossPay,
        totalDeductions: payrollEntries.totalDeductions,
        netPay: payrollEntries.netPay,
        status: payrollEntries.status,
      })
      .from(payrollEntries)
      .where(
        and(
          eq(payrollEntries.tenantId, tenantId),
          eq(payrollEntries.employeeId, employeeId),
          isNull(payrollEntries.deletedAt),
          // period prefix match — startYear or endYear
          sql`(${payrollEntries.period} LIKE ${startYear + '-%'} OR ${payrollEntries.period} LIKE ${endYear + '-%'})`,
        ),
      );

    const inFy = entries.filter((e) => periods.includes(e.period));
    const entryIds = inFy.map((e) => e.id);

    let basicWages = 0;
    let hra = 0;
    let otherAllowances = 0;
    let totalEpf = 0;
    let totalEsic = 0;
    let totalProfessionalTax = 0;
    let totalTds = 0;
    let grossSalary = 0;

    for (const e of inFy) {
      grossSalary += parseFloat(e.grossPay);
    }

    if (entryIds.length > 0) {
      // Pull per-entry component breakdown
      for (const id of entryIds) {
        const components = await this.db
          .select({
            code: salaryComponents.code,
            type: salaryComponents.type,
            amount: payrollEntryComponents.amount,
          })
          .from(payrollEntryComponents)
          .innerJoin(
            salaryComponents,
            eq(payrollEntryComponents.componentId, salaryComponents.id),
          )
          .where(eq(payrollEntryComponents.payrollEntryId, id));

        for (const c of components) {
          const amt = parseFloat(c.amount);
          const code = (c.code || '').toUpperCase();

          if (c.type === 'earning') {
            if (code === 'BASIC' || code === 'BASIC_PAY') basicWages += amt;
            else if (code === 'HRA' || code === 'HRA_ALLOWANCE') hra += amt;
            else otherAllowances += amt;
          } else {
            if (code === 'EPF_EMPLOYEE') totalEpf += amt;
            else if (code === 'ESIC_EMPLOYEE') totalEsic += amt;
            else if (code === 'PROFESSIONAL_TAX') totalProfessionalTax += amt;
            else if (code === 'TDS') totalTds += amt;
          }
        }
      }
    }

    // Tax declarations under the FY
    const declarations = await this.db
      .select({
        section: taxDeclarations.section,
        declaredAmount: taxDeclarations.declaredAmount,
        approvedAmount: taxDeclarations.approvedAmount,
      })
      .from(taxDeclarations)
      .where(
        and(
          eq(taxDeclarations.tenantId, tenantId),
          eq(taxDeclarations.employeeId, employeeId),
          eq(taxDeclarations.fiscalYear, fiscalYear),
          isNull(taxDeclarations.deletedAt),
        ),
      );

    let section80C = 0;
    let section80D = 0;
    let otherDeductions = 0;

    for (const d of declarations) {
      const amt = parseFloat((d.approvedAmount as string | null) ?? d.declaredAmount);
      if (d.section === '80C') section80C += amt;
      else if (d.section === '80D') section80D += amt;
      else otherDeductions += amt;
    }

    // 80C cap at 1.5L, including employee EPF
    const total80C = Math.min(150000, section80C + totalEpf);

    const totalEarnings = basicWages + hra + otherAllowances;
    const standardDeduction = 50000; // Old regime baseline; use 75000 for new in form footer
    const taxableIncome = Math.max(
      0,
      grossSalary - standardDeduction - total80C - section80D - otherDeductions - totalProfessionalTax,
    );

    return {
      grossSalary,
      basicWages,
      hra,
      otherAllowances,
      totalEarnings,
      totalEpf,
      totalEsic,
      totalProfessionalTax,
      totalTds,
      section80C: total80C,
      section80D,
      otherDeductions,
      taxableIncome,
    };
  }

  /**
   * Render the Form 16 PDF (Part A + Part B) using pdfkit.
   */
  private renderPdf(
    employee: Employee,
    fiscalYear: string,
    a: Form16Aggregate,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const fmt = (n: number) =>
          n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // ── Header ──
        doc.fontSize(16).font('Helvetica-Bold').text('FORM 16', { align: 'center' });
        doc.fontSize(10).font('Helvetica')
          .text('Certificate under Section 203 of the Income-tax Act, 1961', { align: 'center' });
        doc.text(`for tax deducted at source on salary — FY ${fiscalYear}`, { align: 'center' });
        doc.moveDown(1);

        // ── Part A: TDS deducted ──
        doc.fontSize(12).font('Helvetica-Bold').text('PART A — Details of tax deducted and deposited');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Employee: ${employee.firstName} ${employee.lastName}`);
        doc.text(`Employee ID: ${employee.employeeId}`);
        doc.text(`PAN: ${employee.panNumber ?? 'N/A'}`);
        doc.text(`Email: ${employee.email}`);
        doc.text(`Date of Joining: ${employee.dateOfJoining}`);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text(`Total TDS deducted (FY ${fiscalYear}): INR ${fmt(a.totalTds)}`);
        doc.moveDown(1);

        // ── Part B: Salary breakdown ──
        doc.fontSize(12).font('Helvetica-Bold').text('PART B — Annexure: Details of salary paid');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        const row = (label: string, value: string, bold = false) => {
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
          doc.text(label, 60, doc.y, { continued: true, width: 360 });
          doc.text(value, { align: 'right' });
        };

        row('1. Gross Salary', `INR ${fmt(a.grossSalary)}`, true);
        row('   (a) Basic Wages', `INR ${fmt(a.basicWages)}`);
        row('   (b) House Rent Allowance', `INR ${fmt(a.hra)}`);
        row('   (c) Other Allowances', `INR ${fmt(a.otherAllowances)}`);
        doc.moveDown(0.3);

        row('2. Less: Standard Deduction (Sec 16)', `INR ${fmt(50000)}`);
        row('3. Less: Professional Tax', `INR ${fmt(a.totalProfessionalTax)}`);
        doc.moveDown(0.3);

        row('4. Deductions under Chapter VI-A', '', true);
        row('   (a) Section 80C (incl. EPF, capped 1.5L)', `INR ${fmt(a.section80C)}`);
        row('   (b) Section 80D (Medical Insurance)', `INR ${fmt(a.section80D)}`);
        row('   (c) Other (80E, 80G, HRA, etc.)', `INR ${fmt(a.otherDeductions)}`);
        doc.moveDown(0.3);

        row('5. Taxable Income', `INR ${fmt(a.taxableIncome)}`, true);
        row('6. Total TDS Deducted', `INR ${fmt(a.totalTds)}`, true);
        row('7. Employee EPF Contribution', `INR ${fmt(a.totalEpf)}`);
        row('8. Employee ESIC Contribution', `INR ${fmt(a.totalEsic)}`);

        doc.moveDown(2);
        doc.fontSize(8).font('Helvetica-Oblique').text(
          'This is a system-generated Form 16 from NexusERP. Verify with payroll records before filing returns.',
          { align: 'center' },
        );

        doc.end();
      } catch (err) {
        reject(err as Error);
      }
    });
  }
}
