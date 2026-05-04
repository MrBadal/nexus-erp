import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  payrollEntries,
  payrollEntryComponents,
  salaryComponents,
  employees,
  departments,
  designations,
  tenants,
} from '../../../database/schema/index.js';

interface PayslipPdfOptions {
  tenantId: string;
  employeeId: string;
  payrollEntryId: string;
}

/**
 * Renders a payslip PDF for a single payroll entry.
 * Returns a Buffer that the controller streams back to the client with
 * `Content-Type: application/pdf`.
 */
@Injectable()
export class PayslipPdfService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async generate(opts: PayslipPdfOptions): Promise<Buffer> {
    const { tenantId, employeeId, payrollEntryId } = opts;

    // 1. Load payroll entry (must belong to this employee)
    const [entry] = await this.db
      .select()
      .from(payrollEntries)
      .where(
        and(
          eq(payrollEntries.id, payrollEntryId),
          eq(payrollEntries.tenantId, tenantId),
          eq(payrollEntries.employeeId, employeeId),
          isNull(payrollEntries.deletedAt),
        ),
      )
      .limit(1);

    if (!entry) {
      throw new NotFoundException('Payroll entry not found');
    }

    // 2. Load employee with department & designation
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
      throw new NotFoundException('Employee not found');
    }

    let departmentName: string | null = null;
    if (emp.departmentId) {
      const [d] = await this.db
        .select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, emp.departmentId))
        .limit(1);
      departmentName = d?.name ?? null;
    }

    let designationName: string | null = null;
    if (emp.designationId) {
      const [d] = await this.db
        .select({ name: designations.name })
        .from(designations)
        .where(eq(designations.id, emp.designationId))
        .limit(1);
      designationName = d?.name ?? null;
    }

    // 3. Load tenant (company) info
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    // 4. Load components broken into earnings vs deductions
    const components = await this.db
      .select({
        id: payrollEntryComponents.id,
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
      .where(eq(payrollEntryComponents.payrollEntryId, payrollEntryId));

    const earnings = components.filter((c) => c.type === 'earning');
    const deductions = components.filter((c) => c.type === 'deduction');

    // 5. Build PDF
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const companyName = tenant?.name ?? 'Company';

        // ── Company Header ──
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text(companyName, { align: 'center' });
        doc
          .moveDown(0.2)
          .fontSize(13)
          .font('Helvetica')
          .text(`Payslip for ${formatPeriod(entry.period)}`, { align: 'center' });
        doc.moveDown(1);

        // Horizontal rule
        const lineY = doc.y;
        doc
          .moveTo(50, lineY)
          .lineTo(545, lineY)
          .strokeColor('#cccccc')
          .stroke();
        doc.moveDown(0.8);

        // ── Employee Details ──
        doc.fontSize(11).font('Helvetica-Bold').text('Employee Details');
        doc.moveDown(0.3);

        const detailY = doc.y;
        doc.font('Helvetica').fontSize(10);
        const leftCol = 50;
        const rightCol = 310;

        doc.text(`Name: ${emp.firstName} ${emp.lastName}`, leftCol, detailY);
        doc.text(`Employee ID: ${emp.employeeId}`, rightCol, detailY);
        doc.text(`Email: ${emp.email}`, leftCol, detailY + 16);
        if (emp.phone) doc.text(`Phone: ${emp.phone}`, rightCol, detailY + 16);
        if (departmentName)
          doc.text(`Department: ${departmentName}`, leftCol, detailY + 32);
        if (designationName)
          doc.text(`Designation: ${designationName}`, rightCol, detailY + 32);
        doc.text(
          `Date of Joining: ${emp.dateOfJoining ?? '-'}`,
          leftCol,
          detailY + 48,
        );
        if (emp.bankAccountNumber) {
          doc.text(
            `Bank A/C: ${maskAccount(emp.bankAccountNumber)}`,
            rightCol,
            detailY + 48,
          );
        }

        doc.y = detailY + 70;
        doc.moveDown(0.5);

        // ── Pay Period & Attendance ──
        doc.fontSize(11).font('Helvetica-Bold').text('Pay Period');
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(10);
        const payY = doc.y;
        doc.text(`Period: ${formatPeriod(entry.period)}`, leftCol, payY);
        doc.text(
          `Working Days: ${entry.workingDays ?? '-'}`,
          rightCol,
          payY,
        );
        doc.text(
          `Present Days: ${entry.presentDays ?? '-'}`,
          leftCol,
          payY + 16,
        );
        doc.text(`LOP Days: ${entry.lopDays ?? 0}`, rightCol, payY + 16);

        doc.y = payY + 36;
        doc.moveDown(0.6);

        // ── Earnings & Deductions Tables ──
        const tableTop = doc.y;
        const colWidth = 247;
        const tableHeight = drawTwoColumnTable(
          doc,
          tableTop,
          50,
          colWidth,
          'Earnings',
          earnings.map((e) => ({ label: e.componentName, amount: e.amount })),
          'Deductions',
          deductions.map((d) => ({ label: d.componentName, amount: d.amount })),
        );

        doc.y = tableTop + tableHeight + 10;

        // ── Totals ──
        const grossPay = parseFloat(entry.grossPay);
        const totalDeductions = parseFloat(entry.totalDeductions);
        const netPay = parseFloat(entry.netPay);

        doc.font('Helvetica-Bold').fontSize(10);
        const totalsY = doc.y;
        doc.text(`Gross Pay: ${formatINR(grossPay)}`, 50, totalsY);
        doc.text(
          `Total Deductions: ${formatINR(totalDeductions)}`,
          rightCol,
          totalsY,
        );
        doc.y = totalsY + 18;

        // ── Net Pay box ──
        const netY = doc.y + 10;
        doc.rect(50, netY, 495, 40).fillAndStroke('#f5f5f5', '#cccccc');
        doc
          .fillColor('#000')
          .fontSize(13)
          .font('Helvetica-Bold')
          .text(`Net Pay: ${formatINR(netPay)}`, 60, netY + 10);
        doc.y = netY + 50;

        doc.moveDown(0.5);
        doc
          .fontSize(9)
          .font('Helvetica-Oblique')
          .text(`Amount in words: ${numberToINRWords(netPay)}`, 50, doc.y, {
            width: 495,
          });

        doc.moveDown(2);

        // ── Signature blocks ──
        const sigY = Math.max(doc.y, 720);
        doc.fontSize(10).font('Helvetica');
        doc
          .moveTo(70, sigY)
          .lineTo(220, sigY)
          .strokeColor('#000')
          .stroke();
        doc.text('Employee Signature', 70, sigY + 4);

        doc
          .moveTo(370, sigY)
          .lineTo(520, sigY)
          .stroke();
        doc.text('Authorized Signatory', 370, sigY + 4);

        doc
          .fontSize(8)
          .fillColor('#888')
          .text(
            'This is a system-generated payslip. No signature required if downloaded from the ESS portal.',
            50,
            sigY + 30,
            { align: 'center', width: 495 },
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

// ─── Helpers ────────────────────────────────────────────

function formatPeriod(period: string): string {
  // period is "YYYY-MM"
  const [y, m] = period.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthIdx = parseInt(m, 10) - 1;
  return `${months[monthIdx] ?? m} ${y}`;
}

function formatINR(value: number): string {
  // 12,34,567.00 (Indian numbering)
  if (!isFinite(value)) return '0.00';
  const fixed = value.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = sign ? intPart.slice(1) : intPart;
  let formatted: string;
  if (digits.length <= 3) {
    formatted = digits;
  } else {
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3);
    formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  return `${sign}₹ ${formatted}.${decPart}`;
}

function maskAccount(acc: string): string {
  if (!acc || acc.length <= 4) return acc;
  return `${'X'.repeat(acc.length - 4)}${acc.slice(-4)}`;
}

interface Row {
  label: string;
  amount: string;
}

function drawTwoColumnTable(
  doc: PDFKit.PDFDocument,
  top: number,
  left: number,
  colWidth: number,
  leftTitle: string,
  leftRows: Row[],
  rightTitle: string,
  rightRows: Row[],
): number {
  const headerH = 22;
  const rowH = 18;
  const maxRows = Math.max(leftRows.length, rightRows.length, 1);
  const total = headerH + maxRows * rowH;

  // Header backgrounds
  doc.rect(left, top, colWidth, headerH).fillAndStroke('#1f2937', '#1f2937');
  doc
    .rect(left + colWidth + 1, top, colWidth, headerH)
    .fillAndStroke('#1f2937', '#1f2937');

  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10);
  doc.text(leftTitle, left + 8, top + 6, { width: colWidth - 16 });
  doc.text(rightTitle, left + colWidth + 9, top + 6, { width: colWidth - 16 });

  // Body
  doc.fillColor('#000').font('Helvetica').fontSize(10);

  for (let i = 0; i < maxRows; i++) {
    const y = top + headerH + i * rowH;
    if (i % 2 === 0) {
      doc
        .rect(left, y, colWidth, rowH)
        .fillAndStroke('#f9fafb', '#e5e7eb');
      doc
        .rect(left + colWidth + 1, y, colWidth, rowH)
        .fillAndStroke('#f9fafb', '#e5e7eb');
      doc.fillColor('#000');
    } else {
      doc
        .rect(left, y, colWidth, rowH)
        .strokeColor('#e5e7eb')
        .stroke();
      doc
        .rect(left + colWidth + 1, y, colWidth, rowH)
        .strokeColor('#e5e7eb')
        .stroke();
    }

    const lr = leftRows[i];
    const rr = rightRows[i];
    if (lr) {
      doc.text(lr.label, left + 8, y + 5, { width: colWidth * 0.6 });
      doc.text(formatINR(parseFloat(lr.amount)), left, y + 5, {
        width: colWidth - 8,
        align: 'right',
      });
    }
    if (rr) {
      doc.text(rr.label, left + colWidth + 9, y + 5, {
        width: colWidth * 0.6,
      });
      doc.text(formatINR(parseFloat(rr.amount)), left + colWidth + 1, y + 5, {
        width: colWidth - 8,
        align: 'right',
      });
    }
  }

  return total;
}

// ── Number-to-words (Indian) ──
function numberToINRWords(amount: number): string {
  if (!isFinite(amount)) return 'Zero Rupees Only';
  const rounded = Math.round(amount * 100);
  const rupees = Math.floor(rounded / 100);
  const paise = rounded % 100;

  let result = `${convertIntToIndianWords(rupees)} Rupees`;
  if (paise > 0) {
    result += ` and ${convertIntToIndianWords(paise)} Paise`;
  }
  return `${result} Only`;
}

function convertIntToIndianWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + convertIntToIndianWords(-num);

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function below100(n: number): string {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o ? ' ' + ones[o] : '');
  }

  function below1000(n: number): string {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let s = '';
    if (h) s += ones[h] + ' Hundred';
    if (r) s += (s ? ' ' : '') + below100(r);
    return s;
  }

  // Indian system: thousand, lakh (10^5), crore (10^7)
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  let parts: string[] = [];
  if (crore) parts.push(below1000(crore) + ' Crore');
  if (lakh) parts.push(below100(lakh) + ' Lakh');
  if (thousand) parts.push(below100(thousand) + ' Thousand');
  if (remainder) parts.push(below1000(remainder));

  return parts.join(' ');
}
