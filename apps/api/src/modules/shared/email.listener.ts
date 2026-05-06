import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { users, tenants, employees } from '../../database/schema/index.js';
import { EmailService } from './email.service.js';

/**
 * Translates domain events into outbound emails. Each handler is best-effort:
 * if SMTP isn't configured for the tenant, EmailService.send() resolves with
 * `{ skipped: true }` and the original flow (e.g. activation URL returned to
 * the admin) still works.
 */
@Injectable()
export class EmailListener {
  private readonly logger = new Logger(EmailListener.name);

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private getPublicUrl(): string {
    return (this.configService.get<string>('app.publicUrl') || '').replace(/\/$/, '');
  }

  // ─── Password reset ─────────────────────────────────────────────────

  @OnEvent('auth.forgot-password')
  async onForgotPassword(payload: { userId: string; email: string; resetToken: string }) {
    const [user] = await this.db
      .select({ id: users.id, tenantId: users.tenantId, firstName: users.firstName, email: users.email })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);
    if (!user) return;

    const url = `${this.getPublicUrl()}/set-password?token=${encodeURIComponent(payload.resetToken)}`;
    const html = this.emailService.wrapTemplate(
      'Reset your NexusERP password',
      `<p>Hi ${this.escape(user.firstName) || 'there'},</p>
       <p>We received a request to reset the password for your NexusERP account
       (<strong>${this.escape(user.email)}</strong>). Click the button below to choose a
       new password. The link expires in 1 hour.</p>
       <p>If you didn't ask to reset your password, you can safely ignore this email — your
       current password will continue to work.</p>`,
      url,
      'Reset password',
    );
    await this.emailService.send({
      tenantId: user.tenantId,
      to: user.email,
      subject: 'Reset your NexusERP password',
      template: 'password_reset',
      html,
      metadata: { userId: user.id },
    });
  }

  // ─── User invited / employee onboarded to ESS ───────────────────────

  @OnEvent('user.invited')
  async onUserInvited(payload: { userId: string; tenantId: string; activationUrl: string; invitedBy?: string }) {
    const [user] = await this.db
      .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);
    if (!user) return;

    const [tenant] = await this.db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, payload.tenantId))
      .limit(1);

    const html = this.emailService.wrapTemplate(
      `Welcome to ${this.escape(tenant?.name || 'NexusERP')}`,
      `<p>Hi ${this.escape(user.firstName) || 'there'},</p>
       <p>An account has been created for you on
       <strong>${this.escape(tenant?.name || 'NexusERP')}</strong>.
       Click the button below to set your password and sign in. The link is
       valid for 7 days.</p>
       <p>Once activated, use this email (<strong>${this.escape(user.email)}</strong>) to log in.</p>`,
      payload.activationUrl,
      'Activate my account',
    );
    await this.emailService.send({
      tenantId: payload.tenantId,
      to: user.email,
      subject: `Activate your ${tenant?.name || 'NexusERP'} account`,
      template: 'invite',
      html,
      metadata: { userId: payload.userId, invitedBy: payload.invitedBy },
    });
  }

  // ─── HR: leave decision ─────────────────────────────────────────────

  @OnEvent('hr.leave.decided')
  async onLeaveDecided(payload: {
    tenantId: string;
    employeeId: string;
    decision: 'approved' | 'rejected';
    fromDate: string;
    toDate: string;
    reason?: string;
    notes?: string;
  }) {
    const email = await this.lookupEmployeeEmail(payload.tenantId, payload.employeeId);
    if (!email) return;
    const verb = payload.decision === 'approved' ? 'approved' : 'rejected';
    const html = this.emailService.wrapTemplate(
      `Your leave request was ${verb}`,
      `<p>Your leave request from <strong>${this.escape(payload.fromDate)}</strong> to
       <strong>${this.escape(payload.toDate)}</strong> has been <strong>${verb}</strong>.</p>
       ${payload.notes ? `<p><strong>Manager note:</strong> ${this.escape(payload.notes)}</p>` : ''}
       <p>Open the Employee Portal to view full details.</p>`,
      `${this.getPublicUrl()}/ess/leave`,
      'Open Employee Portal',
    );
    await this.emailService.send({
      tenantId: payload.tenantId,
      to: email,
      subject: `Leave request ${verb}`,
      template: 'leave_decision',
      html,
      metadata: { employeeId: payload.employeeId, decision: payload.decision },
    });
  }

  // ─── HR: expense decision ──────────────────────────────────────────

  @OnEvent('hr.expense.decided')
  async onExpenseDecided(payload: {
    tenantId: string;
    employeeId: string;
    decision: 'approved' | 'rejected';
    amount?: string | number;
    notes?: string;
  }) {
    const email = await this.lookupEmployeeEmail(payload.tenantId, payload.employeeId);
    if (!email) return;
    const verb = payload.decision === 'approved' ? 'approved' : 'rejected';
    const html = this.emailService.wrapTemplate(
      `Your expense claim was ${verb}`,
      `<p>Your expense claim${payload.amount ? ` for <strong>₹${this.escape(String(payload.amount))}</strong>` : ''} has been <strong>${verb}</strong>.</p>
       ${payload.notes ? `<p><strong>Manager note:</strong> ${this.escape(payload.notes)}</p>` : ''}`,
      `${this.getPublicUrl()}/ess/expenses`,
      'View my expenses',
    );
    await this.emailService.send({
      tenantId: payload.tenantId,
      to: email,
      subject: `Expense claim ${verb}`,
      template: 'expense_decision',
      html,
      metadata: { employeeId: payload.employeeId, decision: payload.decision },
    });
  }

  // ─── HR: payslip ready ─────────────────────────────────────────────

  @OnEvent('hr.payslip.published')
  async onPayslipPublished(payload: {
    tenantId: string;
    employeeId: string;
    period: string;
    netPay?: string | number;
  }) {
    const email = await this.lookupEmployeeEmail(payload.tenantId, payload.employeeId);
    if (!email) return;
    const html = this.emailService.wrapTemplate(
      `Your payslip for ${this.escape(payload.period)} is ready`,
      `<p>Your payslip for <strong>${this.escape(payload.period)}</strong> has been published${
        payload.netPay ? ` with a net pay of <strong>₹${this.escape(String(payload.netPay))}</strong>` : ''
      }.</p>
       <p>Sign in to the Employee Portal to download it.</p>`,
      `${this.getPublicUrl()}/ess/payslips`,
      'Download payslip',
    );
    await this.emailService.send({
      tenantId: payload.tenantId,
      to: email,
      subject: `Payslip ready — ${payload.period}`,
      template: 'payslip_ready',
      html,
      metadata: { employeeId: payload.employeeId, period: payload.period },
    });
  }

  // ─── HR: announcement broadcast ────────────────────────────────────
  // Fan-out to all employees with email addresses. Best-effort, sequential to
  // respect SMTP rate limits; failures are logged per-recipient.

  @OnEvent('hr.announcement.published')
  async onAnnouncementPublished(payload: {
    tenantId: string;
    title: string;
    body: string;
    audience?: 'all' | 'department';
    departmentId?: string;
    publishedBy?: string;
  }) {
    const rows = await this.db
      .select({ email: employees.email })
      .from(employees)
      .where(eq(employees.tenantId, payload.tenantId));
    const recipients = rows.map(r => r.email).filter((e): e is string => !!e);
    if (recipients.length === 0) return;

    const html = this.emailService.wrapTemplate(
      this.escape(payload.title),
      `<div>${payload.body}</div>`,
      `${this.getPublicUrl()}/ess/announcements`,
      'Open Employee Portal',
    );

    for (const to of recipients) {
      try {
        await this.emailService.send({
          tenantId: payload.tenantId,
          to,
          subject: `Announcement: ${payload.title}`,
          template: 'announcement',
          html,
          metadata: { audience: payload.audience ?? 'all' },
        });
      } catch (e) {
        this.logger.warn(`Announcement email to ${to} failed: ${(e as Error).message}`);
      }
    }
  }

  // ─── helpers ───────────────────────────────────────────────────────

  private async lookupEmployeeEmail(tenantId: string, employeeId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ email: employees.email })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);
    return row?.email ?? null;
  }

  private escape(s: string | null | undefined): string {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
