import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq, and, desc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { notifications } from '../../database/schema/index.js';
import { EVENTS } from '../../common/events.constants.js';

export interface CreateNotificationDto {
  tenantId: string;
  userId: string;
  title: string;
  body?: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'invoice' | 'payment' | 'leave' | 'purchase' | 'inventory' | 'system';
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(@Inject('DATABASE') private readonly db: DrizzleDB) {}

  async create(dto: CreateNotificationDto) {
    const [notification] = await this.db
      .insert(notifications)
      .values({
        tenantId: dto.tenantId,
        userId: dto.userId,
        title: dto.title,
        body: dto.body || null,
        type: dto.type || 'info',
        metadata: dto.metadata || null,
      })
      .returning();
    return notification;
  }

  /** Notify all users in a tenant (for broadcast events). */
  async notifyTenantUsers(tenantId: string, title: string, body: string, type: CreateNotificationDto['type'] = 'info', metadata?: Record<string, unknown>) {
    // For now, we create a notification for the tenant admin / relevant users.
    // In a full implementation, we'd query users with appropriate roles.
    // This is called by event handlers that know the target userId.
    this.logger.debug(`Broadcast notification to tenant ${tenantId}: ${title}`);
  }

  async findByUser(tenantId: string, userId: string, options?: { limit?: number; offset?: number; unreadOnly?: boolean }) {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const conditions = [
      eq(notifications.tenantId, tenantId),
      eq(notifications.userId, userId),
    ];

    if (options?.unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }

    const rows = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const unreadCount = await this.getUnreadCount(tenantId, userId);

    return {
      notifications: rows,
      unreadCount,
    };
  }

  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const [updated] = await this.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
        ),
      )
      .returning();
    return updated;
  }

  async markAllAsRead(tenantId: string, userId: string) {
    await this.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
          eq(notifications.read, false),
        ),
      );
    return { success: true };
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const rows = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
          eq(notifications.read, false),
        ),
      );
    return rows.length;
  }

  // ─── Event Handlers ────────────────────────────────────────────────

  @OnEvent(EVENTS.INVOICE_CONFIRMED)
  async onInvoiceConfirmed(payload: { tenantId: string; invoiceId: string; invoiceNumber: string; userId: string }) {
    try {
      await this.create({
        tenantId: payload.tenantId,
        userId: payload.userId,
        title: 'Invoice Confirmed',
        body: `Invoice ${payload.invoiceNumber} has been confirmed and is ready to send.`,
        type: 'invoice',
        metadata: { invoiceId: payload.invoiceId, invoiceNumber: payload.invoiceNumber },
      });
    } catch (err) {
      this.logger.error(`Failed to create notification for invoice confirmed: ${err}`);
    }
  }

  @OnEvent(EVENTS.INVOICE_PAYMENT_RECORDED)
  async onPaymentReceived(payload: { tenantId: string; invoiceId: string; invoiceNumber: string; amount: string; userId: string }) {
    try {
      await this.create({
        tenantId: payload.tenantId,
        userId: payload.userId,
        title: 'Payment Received',
        body: `Payment of ₹${parseFloat(payload.amount).toLocaleString('en-IN')} recorded for invoice ${payload.invoiceNumber}.`,
        type: 'payment',
        metadata: { invoiceId: payload.invoiceId, amount: payload.amount },
      });
    } catch (err) {
      this.logger.error(`Failed to create notification for payment received: ${err}`);
    }
  }

  @OnEvent(EVENTS.LEAVE_APPROVED)
  async onLeaveApproved(payload: { tenantId: string; employeeId: string; applicationId: string; fromDate: string; toDate: string; totalDays: number }) {
    try {
      await this.create({
        tenantId: payload.tenantId,
        userId: payload.employeeId,
        title: 'Leave Approved',
        body: `Your leave from ${payload.fromDate} to ${payload.toDate} (${payload.totalDays} days) has been approved.`,
        type: 'leave',
        metadata: { applicationId: payload.applicationId, fromDate: payload.fromDate, toDate: payload.toDate },
      });
    } catch (err) {
      this.logger.error(`Failed to create notification for leave approved: ${err}`);
    }
  }

  @OnEvent(EVENTS.PURCHASE_RECEIPT_COMPLETED)
  async onPurchaseReceiptCompleted(payload: { tenantId: string; receiptId: string; receiptNumber?: string; userId?: string }) {
    try {
      if (payload.userId) {
        await this.create({
          tenantId: payload.tenantId,
          userId: payload.userId,
          title: 'Purchase Receipt Completed',
          body: `Purchase receipt ${payload.receiptNumber || payload.receiptId} has been completed and stock updated.`,
          type: 'purchase',
          metadata: { receiptId: payload.receiptId },
        });
      }
    } catch (err) {
      this.logger.error(`Failed to create notification for purchase receipt: ${err}`);
    }
  }
}
