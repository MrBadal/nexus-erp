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
import * as bcrypt from 'bcrypt';
import { eq, and } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { users, tenants, roles } from '../../database/schema/index.js';
import { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, VerifyMfaDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

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
    if (user.roleId) {
      const [role] = await this.db
        .select()
        .from(roles)
        .where(eq(roles.id, user.roleId))
        .limit(1);

      if (role) {
        userPermissions = (role.permissions as string[]) || [];
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
    });

    this.eventEmitter.emit('auth.login', {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
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
    });

    this.eventEmitter.emit('auth.register', {
      userId: user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
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
      if (user.roleId) {
        const [role] = await this.db
          .select()
          .from(roles)
          .where(eq(roles.id, user.roleId))
          .limit(1);

        if (role) {
          userPermissions = (role.permissions as string[]) || [];
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

      // TODO: Implement TOTP verification with user.mfaSecret
      // For now, placeholder validation
      if (!verifyMfaDto.code || verifyMfaDto.code.length !== 6) {
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
      if (user.roleId) {
        const [role] = await this.db
          .select()
          .from(roles)
          .where(eq(roles.id, user.roleId))
          .limit(1);

        if (role) {
          userPermissions = (role.permissions as string[]) || [];
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
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired MFA token');
    }
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
