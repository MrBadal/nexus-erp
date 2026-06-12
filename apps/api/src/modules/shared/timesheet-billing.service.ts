import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import {
  timesheets,
  projects,
  invoices,
  invoiceLines,
  accounts,
} from '../../database/schema/index.js';
import { NumberSeriesService } from './number-series.service.js';

/**
 * Cross-module service: Projects (timesheets) → Finance (invoices).
 * Creates invoices from approved, unbilled timesheets for a given project.
 */
@Injectable()
export class TimesheetBillingService {
  private readonly logger = new Logger(TimesheetBillingService.name);

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
  ) {}

  /**
   * Create an invoice from approved timesheets for a project.
   * Aggregates all approved timesheets into invoice line items.
   */
  async createInvoiceFromTimesheets(
    tenantId: string,
    projectId: string,
    customerId: string,
    userId: string,
  ) {
    // Validate project exists
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId)))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get all approved timesheets for this project that haven't been billed
    // (We'll check billingAmount > 0 to ensure they're billable)
    const approvedTimesheets = await this.db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.tenantId, tenantId),
          eq(timesheets.projectId, projectId),
          eq(timesheets.status, 'approved'),
          sql`CAST(${timesheets.billingAmount} AS numeric) > 0`,
        ),
      );

    if (!approvedTimesheets.length) {
      throw new BadRequestException(
        'No approved billable timesheets found for this project',
      );
    }

    // Calculate totals
    let subtotal = 0;
    const lineItems = approvedTimesheets.map((ts, index) => {
      const amount = parseFloat(ts.billingAmount);
      subtotal += amount;

      return {
        lineNumber: index + 1,
        description: `${ts.activityType} - ${ts.employeeName} (${ts.date}, ${ts.billingHours}hrs @ ₹${parseFloat(ts.billingRate).toFixed(2)}/hr)`,
        quantity: ts.billingHours,
        unitPrice: ts.billingRate,
        amount: ts.billingAmount,
        discountAmount: '0',
      };
    });

    // Look up Service Revenue account (4020)
    const [revenueAcct] = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, '4020')))
      .limit(1);

    // Generate invoice number
    const invoiceNumber = await this.numberSeriesService.getNext(tenantId, 'invoice');

    // Create invoice
    const [invoice] = await this.db
      .insert(invoices)
      .values({
        tenantId,
        invoiceNumber,
        customerId,
        type: 'standard',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: this.addDays(new Date(), 30).toISOString().split('T')[0],
        status: 'draft',
        subtotal: subtotal.toFixed(2),
        taxAmount: '0',
        discountAmount: '0',
        total: subtotal.toFixed(2),
        balanceDue: subtotal.toFixed(2),
        currencyCode: 'INR',
        notes: `Timesheet billing for project: ${project.name}`,
        createdBy: userId,
      })
      .returning();

    // Create invoice lines
    await this.db.insert(invoiceLines).values(
      lineItems.map((line) => ({
        tenantId,
        invoiceId: invoice.id,
        lineNumber: line.lineNumber,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.amount,
        discountAmount: line.discountAmount,
        accountId: revenueAcct?.id || null,
      })),
    );

    this.logger.log(
      `Created invoice ${invoiceNumber} from ${approvedTimesheets.length} timesheets for project ${project.name} — ₹${subtotal.toFixed(2)}`,
    );

    return {
      invoiceId: invoice.id,
      invoiceNumber,
      totalAmount: subtotal,
      timesheetCount: approvedTimesheets.length,
      projectName: project.name,
    };
  }

  /**
   * Get billing summary for a project (unbilled approved timesheets).
   */
  async getBillingSummary(tenantId: string, projectId: string) {
    const [result] = await this.db
      .select({
        count: sql<string>`COUNT(*)`,
        totalHours: sql<string>`COALESCE(SUM(CAST(${timesheets.billingHours} AS numeric)), 0)`,
        totalAmount: sql<string>`COALESCE(SUM(CAST(${timesheets.billingAmount} AS numeric)), 0)`,
      })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.tenantId, tenantId),
          eq(timesheets.projectId, projectId),
          eq(timesheets.status, 'approved'),
          sql`CAST(${timesheets.billingAmount} AS numeric) > 0`,
        ),
      );

    return {
      unbilledTimesheets: parseInt(result?.count || '0'),
      totalHours: parseFloat(result?.totalHours || '0'),
      totalAmount: parseFloat(result?.totalAmount || '0'),
    };
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
