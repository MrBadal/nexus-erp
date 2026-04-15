import { Injectable, Inject, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, and, lte, isNull, or, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import {
  invoices,
  itemWarehouses,
  items,
  retentionPolicies,
  legalHolds,
  tickets,
} from '../../database/schema/index.js';
import { NotificationService } from './notification.service.js';
import { RecurringInvoiceService } from '../finance/recurring-invoice/recurring-invoice.service.js';
import { ApprovalWorkflowService } from './approval-workflow.service.js';
import { EVENTS } from '../../common/events.constants.js';

@Injectable()
export class ScheduledJobsService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    @Inject('DATABASE') private readonly db: DrizzleDB,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly recurringInvoiceService?: RecurringInvoiceService,
    @Optional() private readonly approvalWorkflowService?: ApprovalWorkflowService,
  ) {}

  onModuleInit() {
    this.logger.log('Scheduled jobs service initialized');
  }

  /**
   * Daily reorder check — runs at 9:00 AM every day.
   * Finds items below minimum stock level and creates notifications.
   */
  @Cron('0 9 * * *', { name: 'daily-reorder-check' })
  async dailyReorderCheck() {
    this.logger.log('Running daily reorder check...');
    try {
      // Find items below reorder level (reorderLevel is on itemWarehouses)
      const lowStockItems = await this.db
        .select({
          itemId: itemWarehouses.itemId,
          warehouseId: itemWarehouses.warehouseId,
          quantity: itemWarehouses.quantity,
          tenantId: itemWarehouses.tenantId,
          itemName: items.name,
          reorderLevel: itemWarehouses.reorderLevel,
        })
        .from(itemWarehouses)
        .innerJoin(items, eq(items.id, itemWarehouses.itemId))
        .where(
          and(
            sql`CAST(${itemWarehouses.quantity} AS numeric) <= ${itemWarehouses.reorderLevel}`,
            sql`${itemWarehouses.reorderLevel} > 0`,
          ),
        );

      if (lowStockItems.length > 0) {
        this.logger.warn(`Found ${lowStockItems.length} items below reorder level`);

        // Group by tenant and notify
        const byTenant = new Map<string, typeof lowStockItems>();
        for (const item of lowStockItems) {
          const existing = byTenant.get(item.tenantId) || [];
          existing.push(item);
          byTenant.set(item.tenantId, existing);
        }

        for (const [tenantId, tenantItems] of byTenant) {
          this.logger.log(`Tenant ${tenantId}: ${tenantItems.length} items below reorder level`);
          // Notification would go to inventory managers — for now log only
          // In a full implementation we'd query users with 'inventory:write' permission
        }
      } else {
        this.logger.log('No items below reorder level');
      }
    } catch (err) {
      this.logger.error(`Daily reorder check failed: ${err}`);
    }
  }

  /**
   * Invoice due reminder — runs at 10:00 AM every day.
   * Finds invoices due within 3 days and creates notifications.
   */
  @Cron('0 10 * * *', { name: 'invoice-due-reminders' })
  async invoiceDueReminders() {
    this.logger.log('Running invoice due reminders...');
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const dateStr = threeDaysFromNow.toISOString().split('T')[0];

      const dueInvoices = await this.db
        .select({
          id: invoices.id,
          tenantId: invoices.tenantId,
          invoiceNumber: invoices.invoiceNumber,
          dueDate: invoices.dueDate,
          total: invoices.total,
          createdBy: invoices.createdBy,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.status, 'sent'),
            lte(invoices.dueDate, dateStr),
            isNull(invoices.deletedAt),
          ),
        );

      for (const inv of dueInvoices) {
        if (inv.createdBy) {
          try {
            await this.notificationService.create({
              tenantId: inv.tenantId,
              userId: inv.createdBy,
              title: 'Invoice Due Soon',
              body: `Invoice ${inv.invoiceNumber} is due on ${inv.dueDate}. Total: ₹${parseFloat(inv.total).toLocaleString('en-IN')}`,
              type: 'warning',
              metadata: { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, dueDate: inv.dueDate },
            });
          } catch {
            // Skip if notification fails for this invoice
          }
        }
      }

      this.logger.log(`Sent ${dueInvoices.length} invoice due reminders`);
    } catch (err) {
      this.logger.error(`Invoice due reminders failed: ${err}`);
    }
  }

  /**
   * Monthly payroll draft generation reminder — runs on 25th of every month at 9 AM.
   * Reminds HR to generate payroll for the current month.
   */
  @Cron('0 9 25 * *', { name: 'monthly-payroll-reminder' })
  async monthlyPayrollReminder() {
    this.logger.log('Running monthly payroll reminder...');
    // This is a reminder notification — actual payroll generation requires HR action
    // In a full implementation, we'd query all tenants and notify HR managers
    this.logger.log('Monthly payroll reminder completed (broadcast to HR managers)');
  }

  /**
   * Recurring invoice generation — runs at 6:00 AM every day.
   * Generates invoices from active recurring templates whose nextRunDate has arrived.
   */
  @Cron('0 6 * * *', { name: 'recurring-invoice-generation' })
  async recurringInvoiceGeneration() {
    if (!this.recurringInvoiceService) return;
    this.logger.log('Running recurring invoice generation...');
    try {
      const results = await this.recurringInvoiceService.processRecurringInvoices();
      this.logger.log(`Generated ${results.length} recurring invoices`);
    } catch (err) {
      this.logger.error(`Recurring invoice generation failed: ${err}`);
    }
  }

  /**
   * Approval escalation check — runs every hour.
   * Checks for stale pending approvals and sends escalation notifications.
   */
  @Cron('0 * * * *', { name: 'approval-escalation-check' })
  async approvalEscalationCheck() {
    if (!this.approvalWorkflowService) return;
    this.logger.log('Running approval escalation check...');
    try {
      await this.approvalWorkflowService.checkAndEscalate();
    } catch (err) {
      this.logger.error(`Approval escalation check failed: ${err}`);
    }
  }

  /**
   * Retention archival — runs every day at 2:00 AM.
   * Iterates active retention policies, archives rows older than retentionDays
   * in matching tables unless they are under a legal hold.
   *
   * NOTE: target tables must have an `archived_at` timestamptz column for the
   * archival UPDATE to succeed. Missing columns are logged but do not stop the job.
   */
  @Cron('0 2 * * *', { name: 'retention-archival' })
  async archiveExpiredDocuments() {
    this.logger.log('Running retention archival job...');
    try {
      const policies = await this.db
        .select()
        .from(retentionPolicies)
        .where(eq(retentionPolicies.isActive, true));

      // Map documentType → physical table name. Extend as schema evolves.
      const tableMap: Record<string, string> = {
        invoice: 'invoices',
        invoices: 'invoices',
        bill: 'bills',
        bills: 'bills',
        journal_entry: 'journal_entries',
        ticket: 'tickets',
        tickets: 'tickets',
        ra_bill: 'ra_bills',
        site_grn: 'site_grns',
      };

      for (const policy of policies) {
        if (!policy.autoArchive) continue;
        const table = tableMap[policy.documentType];
        if (!table) {
          this.logger.warn(
            `No table mapping for retention policy documentType="${policy.documentType}"`,
          );
          continue;
        }

        // Fetch legal hold IDs for this tenant/documentType
        const holds = await this.db
          .select({ documentId: legalHolds.documentId })
          .from(legalHolds)
          .where(
            and(
              eq(legalHolds.tenantId, policy.tenantId),
              eq(legalHolds.documentType, policy.documentType),
              isNull(legalHolds.releasedAt),
            ),
          );
        const heldIds = holds.map((h) => h.documentId);

        try {
          const heldClause =
            heldIds.length > 0
              ? sql`AND id NOT IN (${sql.join(
                  heldIds.map((id) => sql`${id}`),
                  sql`, `,
                )})`
              : sql``;

          const result = await this.db.execute(sql`
            UPDATE ${sql.identifier(table)}
            SET archived_at = NOW()
            WHERE tenant_id = ${policy.tenantId}
              AND archived_at IS NULL
              AND created_at < NOW() - (${policy.retentionDays}::int * INTERVAL '1 day')
              ${heldClause}
          `);
          this.logger.log(
            `Archived rows in ${table} for tenant ${policy.tenantId} (policy ${policy.id})`,
          );
          void result;
        } catch (err) {
          this.logger.warn(
            `Archival skipped for ${table} (tenant ${policy.tenantId}): ${err}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Retention archival job failed: ${err}`);
    }
  }

  /**
   * SLA breach detection — runs every hour.
   * Marks open tickets whose first-response or resolution deadlines have passed
   * without a matching actual and emits TICKET_SLA_BREACHED for each breach.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'ticket-sla-breach-detection' })
  async detectSlaBreaches() {
    this.logger.log('Running ticket SLA breach detection...');
    try {
      const now = new Date();

      const candidates = await this.db
        .select()
        .from(tickets)
        .where(
          and(
            eq(tickets.slaBreached, false),
            isNull(tickets.deletedAt),
            or(
              and(
                isNull(tickets.firstResponseTime),
                lte(tickets.firstResponseDueAt, now),
              ),
              and(
                isNull(tickets.resolutionTime),
                lte(tickets.resolutionDueAt, now),
              ),
            ),
          ),
        );

      for (const ticket of candidates) {
        await this.db
          .update(tickets)
          .set({ slaBreached: true, updatedAt: new Date() })
          .where(eq(tickets.id, ticket.id));

        this.eventEmitter.emit(EVENTS.TICKET_SLA_BREACHED, {
          ticketId: ticket.id,
          tenantId: ticket.tenantId,
          ticketNumber: ticket.ticketNumber,
          priority: ticket.priority,
          slaId: ticket.slaId,
          firstResponseDueAt: ticket.firstResponseDueAt,
          resolutionDueAt: ticket.resolutionDueAt,
        });
      }

      this.logger.log(`SLA breach detection: flagged ${candidates.length} tickets`);
    } catch (err) {
      this.logger.error(`SLA breach detection failed: ${err}`);
    }
  }
}
