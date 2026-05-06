import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { eq } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { smtpSettings, emailLogs, type SmtpSettings } from '../../database/schema/index.js';

interface SendArgs {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: string;
  metadata?: Record<string, unknown>;
}

interface SmtpInput {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string; // optional on update — keep existing
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  enabled?: boolean;
}

const ALG = 'aes-256-gcm';
const IV_LEN = 12;

/**
 * Per-tenant outbound email pipeline.
 *
 * - Reads SMTP creds from `smtp_settings` (one row per tenant).
 * - Decrypts password with AES-256-GCM keyed by SMTP_ENCRYPTION_KEY (32 bytes
 *   hex/base64) — falls back to a SHA-256 hash of JWT_SECRET so deployments
 *   that haven't set the dedicated key still work, but we log a warning.
 * - Caches `nodemailer.Transporter` per tenant; invalidated on settings update.
 * - Logs every send (success or failure) to `email_logs` for audit.
 *
 * If a tenant has no SMTP row OR the row is disabled, send() resolves to
 * `{ skipped: true }` so callers can decide whether to surface a fallback
 * (e.g. return the activation URL to the admin to share manually).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporters = new Map<string, Transporter>();

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly configService: ConfigService,
  ) {}

  // ─── Encryption ──────────────────────────────────────────────────────

  private getKey(): Buffer {
    const raw = process.env.SMTP_ENCRYPTION_KEY;
    if (raw) {
      if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
      const buf = Buffer.from(raw, 'base64');
      if (buf.length === 32) return buf;
      this.logger.warn('SMTP_ENCRYPTION_KEY set but not 32 bytes (hex/base64); falling back to derived key');
    }
    // Derived fallback — deterministic per deployment, fine for SMTP creds at rest.
    const seed = this.configService.get<string>('app.jwtSecret') || 'change-this-secret';
    return crypto.createHash('sha256').update(`smtp:${seed}`).digest();
  }

  encryptPassword(plain: string): string {
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALG, this.getKey(), iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
  }

  private decryptPassword(blob: string): string {
    const [ivB64, tagB64, ctB64] = blob.split(':');
    if (!ivB64 || !tagB64 || !ctB64) throw new Error('Malformed encrypted password');
    const decipher = crypto.createDecipheriv(ALG, this.getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  }

  // ─── Settings CRUD ───────────────────────────────────────────────────

  async getSettings(tenantId: string): Promise<(Omit<SmtpSettings, 'passwordEncrypted'> & { passwordSet: boolean }) | null> {
    const [row] = await this.db
      .select()
      .from(smtpSettings)
      .where(eq(smtpSettings.tenantId, tenantId))
      .limit(1);
    if (!row) return null;
    const { passwordEncrypted, ...safe } = row;
    return { ...safe, passwordSet: !!passwordEncrypted };
  }

  async upsertSettings(tenantId: string, input: SmtpInput) {
    if (!input.host || !input.username || !input.fromEmail) {
      throw new BadRequestException('host, username and fromEmail are required');
    }
    const existing = await this.db
      .select()
      .from(smtpSettings)
      .where(eq(smtpSettings.tenantId, tenantId))
      .limit(1);

    const encryptedPassword =
      input.password && input.password.length > 0
        ? this.encryptPassword(input.password)
        : existing[0]?.passwordEncrypted;

    if (!encryptedPassword) {
      throw new BadRequestException('password is required on first save');
    }

    if (existing.length === 0) {
      await this.db.insert(smtpSettings).values({
        tenantId,
        host: input.host,
        port: input.port ?? 587,
        secure: input.secure ?? false,
        username: input.username,
        passwordEncrypted: encryptedPassword,
        fromEmail: input.fromEmail,
        fromName: input.fromName ?? null,
        replyTo: input.replyTo ?? null,
        enabled: input.enabled ?? true,
      });
    } else {
      await this.db
        .update(smtpSettings)
        .set({
          host: input.host,
          port: input.port ?? 587,
          secure: input.secure ?? false,
          username: input.username,
          passwordEncrypted: encryptedPassword,
          fromEmail: input.fromEmail,
          fromName: input.fromName ?? null,
          replyTo: input.replyTo ?? null,
          enabled: input.enabled ?? true,
          updatedAt: new Date(),
        })
        .where(eq(smtpSettings.tenantId, tenantId));
    }

    this.transporters.delete(tenantId);
    return this.getSettings(tenantId);
  }

  async deleteSettings(tenantId: string) {
    await this.db.delete(smtpSettings).where(eq(smtpSettings.tenantId, tenantId));
    this.transporters.delete(tenantId);
    return { message: 'SMTP settings removed' };
  }

  // ─── Transport ──────────────────────────────────────────────────────

  private async getTransporter(tenantId: string): Promise<{ transporter: Transporter; cfg: SmtpSettings } | null> {
    const [cfg] = await this.db
      .select()
      .from(smtpSettings)
      .where(eq(smtpSettings.tenantId, tenantId))
      .limit(1);
    if (!cfg || !cfg.enabled) return null;

    const cached = this.transporters.get(tenantId);
    if (cached) return { transporter: cached, cfg };

    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.username, pass: this.decryptPassword(cfg.passwordEncrypted) },
      // Modest connection pool — suits SME volumes, avoids opening sockets per send.
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });
    this.transporters.set(tenantId, transporter);
    return { transporter, cfg };
  }

  // ─── Send ───────────────────────────────────────────────────────────

  async send(args: SendArgs): Promise<{ sent: boolean; skipped?: boolean; messageId?: string; error?: string }> {
    const t = await this.getTransporter(args.tenantId);
    if (!t) {
      this.logger.warn(`SMTP not configured for tenant ${args.tenantId}; skipping email "${args.subject}"`);
      return { sent: false, skipped: true };
    }
    const { transporter, cfg } = t;
    const from = cfg.fromName ? `"${cfg.fromName}" <${cfg.fromEmail}>` : cfg.fromEmail;
    try {
      const info = await transporter.sendMail({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text ?? this.htmlToText(args.html),
        replyTo: cfg.replyTo ?? undefined,
      });
      await this.db.insert(emailLogs).values({
        tenantId: args.tenantId,
        toAddress: args.to,
        subject: args.subject,
        template: args.template ?? null,
        status: 'sent',
        messageId: info.messageId ?? null,
        metadata: args.metadata ?? null,
      });
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.logger.error(`Email send failed (tenant=${args.tenantId}, to=${args.to}): ${msg}`);
      await this.db.insert(emailLogs).values({
        tenantId: args.tenantId,
        toAddress: args.to,
        subject: args.subject,
        template: args.template ?? null,
        status: 'failed',
        errorMessage: msg,
        metadata: args.metadata ?? null,
      });
      // Burn the cached transporter — credentials may have rotated.
      this.transporters.delete(args.tenantId);
      return { sent: false, error: msg };
    }
  }

  /**
   * Verify the SMTP config without sending a real message — used by the
   * "Test connection" button in Settings.
   */
  async testConnection(tenantId: string): Promise<{ ok: boolean; error?: string }> {
    const t = await this.getTransporter(tenantId);
    if (!t) throw new NotFoundException('SMTP not configured for this tenant');
    try {
      await t.transporter.verify();
      await this.db
        .update(smtpSettings)
        .set({ lastTestedAt: new Date(), lastTestStatus: 'success', lastTestError: null })
        .where(eq(smtpSettings.tenantId, tenantId));
      return { ok: true };
    } catch (err: any) {
      const msg = err?.message || String(err);
      await this.db
        .update(smtpSettings)
        .set({ lastTestedAt: new Date(), lastTestStatus: 'failure', lastTestError: msg })
        .where(eq(smtpSettings.tenantId, tenantId));
      this.transporters.delete(tenantId);
      return { ok: false, error: msg };
    }
  }

  /**
   * Actually deliver a test email to a given inbox. Useful for confirming
   * end-to-end (DNS, SPF/DKIM at provider, deliverability) — verify() only
   * proves the auth handshake.
   */
  async sendTestEmail(tenantId: string, toAddress: string) {
    return this.send({
      tenantId,
      to: toAddress,
      subject: 'NexusERP SMTP test message',
      template: 'smtp_test',
      html: this.wrapTemplate(
        'SMTP test successful',
        `<p>This is a test message from NexusERP confirming your SMTP credentials are working.</p>
         <p>If you received this, password resets, invitations and notifications will deliver
         from your configured "from" address.</p>`,
      ),
    });
  }

  // ─── Templates (lightweight inline HTML) ─────────────────────────────

  wrapTemplate(title: string, bodyHtml: string, ctaHref?: string, ctaLabel?: string): string {
    const cta = ctaHref && ctaLabel
      ? `<p style="margin:24px 0;"><a href="${ctaHref}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">${ctaLabel}</a></p>
         <p style="font-size:12px;color:#6b7280;">If the button does not work, paste this URL into your browser:<br/><a href="${ctaHref}">${ctaHref}</a></p>`
      : '';
    return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr><td style="background:#111827;color:#fff;padding:20px 24px;">
      <strong style="font-size:18px;">NexusERP</strong>
    </td></tr>
    <tr><td style="padding:24px;">
      <h2 style="margin:0 0 16px;font-size:20px;">${title}</h2>
      ${bodyHtml}
      ${cta}
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
      <p style="font-size:12px;color:#6b7280;margin:0;">This message was sent automatically by NexusERP. If you weren't expecting it, you can safely ignore it.</p>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
