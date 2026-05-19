import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { users, tenants, roles } from '../../database/schema/index.js';
import { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, VerifyMfaDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuditService } from '../audit/audit.service.js';

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
  ) {}

  async login(loginDto: LoginDto) {
    // Find tenant by slug
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, loginDto.tenantSlug))
      .limit(1);

    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
      throw new UnauthorizedException('Tenant account is not active');
    }

    // Find user by email within tenant
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, loginDto.email), eq(users.tenantId, tenant.id)))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lock
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new UnauthorizedException(
        'Account is locked. Please try again later.',
      );
    }

    if (user.status === 'locked') {
      throw new UnauthorizedException('Account has been locked by an administrator');
    }

    if (user.status === 'inactive') {
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.status === 'pending_verification') {
      throw new UnauthorizedException(
        'Account not yet activated. Open the activation link your admin shared and set your password to continue.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: newAttempts };

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_DURATION_MINUTES);
        updateData.lockedUntil = lockUntil;
        updateData.status = 'locked';
      }

      await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.id));

      await this.auditService.logSecurityEvent({
        tenantId: tenant.id,
        userId: user.id,
        eventType: 'login_failed',
        details: { email: loginDto.email },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check MFA
    if (user.mfaEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, tenantId: tenant.id, mfaPending: true },
        { expiresIn: '5m' },
      );

      return {
        requiresMfa: true,
        tempToken,
      };
    }

    // Reset failed attempts and update last login
    await this.db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Fetch user role and permissions
    let userPermissions: string[] = [];
    let roleSlug: string | undefined;
    if (user.roleId) {
      const [role] = await this.db
        .select()
        .from(roles)
        .where(eq(roles.id, user.roleId))
        .limit(1);

      if (role) {
        userPermissions = (role.permissions as string[]) || [];
        roleSlug = role.slug;
      }
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      roleId: user.roleId || '',
      permissions: userPermissions,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId ?? null,
      roleSlug,
    });

    await this.auditService.logSecurityEvent({
      tenantId: tenant.id,
      userId: user.id,
      eventType: 'login_success',
    });

    this.eventEmitter.emit('auth.login', {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
    });

    return {
      ...tokens,
      // Top-level permissions list so the frontend auth store can populate
      // `nexus_permissions` localStorage and the sidebar/route guard work.
      permissions: userPermissions,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        roleSlug,
        employeeId: user.employeeId ?? null,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if tenant slug exists
    const [existingTenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, registerDto.tenantSlug))
      .limit(1);

    if (existingTenant) {
      throw new ConflictException('Tenant slug already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, SALT_ROUNDS);

    // Create tenant
    const [tenant] = await this.db
      .insert(tenants)
      .values({
        name: registerDto.tenantName,
        slug: registerDto.tenantSlug,
        billingEmail: registerDto.billingEmail,
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      })
      .returning();

    // Create default admin role
    const [adminRole] = await this.db
      .insert(roles)
      .values({
        tenantId: tenant.id,
        name: 'Administrator',
        slug: 'admin',
        description: 'Full system access',
        isSystem: true,
        hierarchyLevel: 0,
        permissions: ['*'],
      })
      .returning();

    // Create user
    const [user] = await this.db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: registerDto.email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone || null,
        roleId: adminRole.id,
        status: 'active',
        emailVerifiedAt: new Date(),
      })
      .returning();

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      roleId: adminRole.id,
      permissions: ['*'],
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: null,
      roleSlug: 'admin',
    });

    this.eventEmitter.emit('auth.register', {
      userId: user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });

    return {
      ...tokens,
      // Mirrors login(): top-level permissions + roleSlug/employeeId on user object
      // so the frontend auth store gets a fully-populated session and the sidebar
      // shows the admin's full module set immediately after signup.
      permissions: ['*'],
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        roleSlug: 'admin',
        employeeId: null,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('app.jwtSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify user still exists and is active
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User account is not active');
      }

      let userPermissions: string[] = [];
      let roleSlug: string | undefined;
      if (user.roleId) {
        const [role] = await this.db
          .select()
          .from(roles)
          .where(eq(roles.id, user.roleId))
          .limit(1);

        if (role) {
          userPermissions = (role.permissions as string[]) || [];
          roleSlug = role.slug;
        }
      }

      return this.generateTokens({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roleId: user.roleId || '',
        permissions: userPermissions,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId ?? null,
        roleSlug,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, forgotPasswordDto.tenantSlug))
      .limit(1);

    if (!tenant) {
      // Return success even if tenant not found to prevent enumeration
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, forgotPasswordDto.email),
          eq(users.tenantId, tenant.id),
        ),
      )
      .limit(1);

    if (user) {
      const resetToken = this.jwtService.sign(
        { sub: user.id, tenantId: tenant.id, type: 'password_reset' },
        { expiresIn: '1h' },
      );

      this.eventEmitter.emit('auth.forgot-password', {
        userId: user.id,
        email: user.email,
        resetToken,
      });
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(resetPasswordDto.token, {
        secret: this.configService.get<string>('app.jwtSecret'),
      });

      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid reset token');
      }

      // Token single-use: reject if user password has changed since the token was issued.
      // passwordChangedAt >= iat means this token (or an older one) has already been used.
      const [currentUser] = await this.db
        .select({ passwordChangedAt: users.passwordChangedAt })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (currentUser?.passwordChangedAt && payload.iat) {
        const tokenIssuedAt = payload.iat * 1000;
        if (currentUser.passwordChangedAt.getTime() >= tokenIssuedAt) {
          throw new BadRequestException('Reset token has already been used');
        }
      }

      const passwordHash = await bcrypt.hash(resetPasswordDto.newPassword, SALT_ROUNDS);

      await this.db
        .update(users)
        .set({
          passwordHash,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: 'active',
        })
        .where(eq(users.id, payload.sub));

      await this.auditService.logSecurityEvent({
        tenantId: payload.tenantId,
        userId: payload.sub,
        eventType: 'password_change',
      });

      // Send the "your password was changed" confirmation email via SMTP.
      this.eventEmitter.emit('auth.password-changed', {
        tenantId: payload.tenantId,
        userId: payload.sub,
      });

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async verifyMfa(verifyMfaDto: VerifyMfaDto) {
    try {
      const payload = this.jwtService.verify(verifyMfaDto.tempToken, {
        secret: this.configService.get<string>('app.jwtSecret'),
      });

      if (!payload.mfaPending) {
        throw new UnauthorizedException('Invalid MFA token');
      }

      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user || !user.mfaSecret) {
        throw new UnauthorizedException('MFA not configured');
      }

      // RFC 6238 TOTP verification with ±1 window tolerance
      if (!verifyMfaDto.code || !/^\d{6}$/.test(verifyMfaDto.code)) {
        throw new UnauthorizedException('Invalid MFA code');
      }

      if (!this.verifyTotp(user.mfaSecret, verifyMfaDto.code)) {
        await this.auditService.logSecurityEvent({
          tenantId: user.tenantId,
          userId: user.id,
          eventType: 'login_failed',
          details: { reason: 'invalid_mfa_code' },
        });
        throw new UnauthorizedException('Invalid MFA code');
      }

      await this.db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, user.id));

      let userPermissions: string[] = [];
      let roleSlug: string | undefined;
      if (user.roleId) {
        const [role] = await this.db
          .select()
          .from(roles)
          .where(eq(roles.id, user.roleId))
          .limit(1);

        if (role) {
          userPermissions = (role.permissions as string[]) || [];
          roleSlug = role.slug;
        }
      }

      return this.generateTokens({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roleId: user.roleId || '',
        permissions: userPermissions,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId ?? null,
        roleSlug,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired MFA token');
    }
  }

  /**
   * Generate a new base32 TOTP secret and corresponding otpauth:// URL.
   * Caller persists the secret on the user row and renders the URL as a QR.
   */
  async enableMfa(userId: string, tenantId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) throw new NotFoundException('User not found');

    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const secret = this.generateBase32Secret(20); // 160 bits
    const issuer = encodeURIComponent(`NexusERP (${tenant?.slug || tenant?.name || 'app'})`);
    const label = encodeURIComponent(user.email);
    const otpauthUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    await this.db
      .update(users)
      .set({ mfaSecret: secret, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { secret, otpauthUrl };
  }

  /** Generate a cryptographically random base32 secret of n bytes. */
  private generateBase32Secret(bytes: number): string {
    const buf = crypto.randomBytes(bytes);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of buf) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        out += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
    return out;
  }

  /** Verify a 6-digit TOTP code against a base32 secret (RFC 6238, 30s step, ±1 window). */
  private verifyTotp(base32Secret: string, code: string): boolean {
    const key = this.base32Decode(base32Secret);
    const counter = Math.floor(Date.now() / 1000 / 30);
    for (let offset = -1; offset <= 1; offset++) {
      if (this.hotp(key, counter + offset) === code) return true;
    }
    return false;
  }

  /** HOTP (RFC 4226) — 6-digit dynamic truncation. */
  private hotp(key: Buffer, counter: number): string {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const off = hmac[hmac.length - 1] & 0x0f;
    const bin =
      ((hmac[off] & 0x7f) << 24) |
      ((hmac[off + 1] & 0xff) << 16) |
      ((hmac[off + 2] & 0xff) << 8) |
      (hmac[off + 3] & 0xff);
    return (bin % 1_000_000).toString().padStart(6, '0');
  }

  /** Decode RFC 4648 base32 (uppercase, no padding required). */
  private base32Decode(input: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = input.replace(/=+$/, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const char of cleaned) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }

  private async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: 'access' },
        { expiresIn: this.configService.get<string>('app.jwtExpiresIn') },
      ),
      this.jwtService.signAsync(
        { sub: payload.sub, tenantId: payload.tenantId, type: 'refresh' },
        { expiresIn: this.configService.get<string>('app.jwtRefreshExpiresIn') },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('app.jwtExpiresIn'),
    };
  }
}
