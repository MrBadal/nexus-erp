import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { users, type NewUser } from '../../database/schema/index.js';

const SALT_ROUNDS = 12;
const ACTIVATION_TOKEN_TTL = '7d';

@Injectable()
export class UserService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Builds a one-time activation/reset URL for a user. The token is the same
   * shape AuthService.resetPassword() already accepts (type='password_reset'),
   * so the user can hit /auth/set-password?token=… and set their own
   * password — at which point AuthService flips status from
   * pending_verification → active.
   *
   * Caller decides whether to email the URL or hand it to the admin to
   * share manually (no SMTP wired yet).
   */
  buildActivationUrl(userId: string, tenantId: string): string {
    const token = this.jwtService.sign(
      { sub: userId, tenantId, type: 'password_reset' },
      {
        secret: this.configService.get<string>('app.jwtSecret'),
        expiresIn: ACTIVATION_TOKEN_TTL,
      },
    );
    const base = (this.configService.get<string>('app.publicUrl') || '')
      .replace(/\/$/, '');
    return `${base}/set-password?token=${encodeURIComponent(token)}`;
  }

  async findAll(tenantId: string) {
    return this.db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        phone: users.phone,
        roleId: users.roleId,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
        mfaEnabled: users.mfaEnabled,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)));
  }

  async findById(tenantId: string, id: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        phone: users.phone,
        roleId: users.roleId,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
        mfaEnabled: users.mfaEnabled,
        lastLoginAt: users.lastLoginAt,
        preferences: users.preferences,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.tenantId, tenantId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async findByEmail(tenantId: string, email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.tenantId, tenantId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    return user || null;
  }

  async create(
    tenantId: string,
    data: {
      email: string;
      /** Optional. If omitted, a random hash is stored and the response includes
       *  an `activationUrl` the admin shares with the user to set their own password. */
      password?: string;
      firstName: string;
      lastName: string;
      phone?: string;
      roleId?: string;
      /** When true (the default), force the invite flow even if a password was supplied. */
      sendInvite?: boolean;
    },
  ) {
    // Check email uniqueness within tenant
    const existing = await this.findByEmail(tenantId, data.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists in this tenant');
    }

    const useInviteFlow = data.sendInvite !== false && !data.password;

    // If admin didn't set a password, store a random unguessable hash. The user
    // will replace it via the activation link.
    const rawSecret =
      data.password ?? crypto.randomBytes(32).toString('base64url');
    const passwordHash = await bcrypt.hash(rawSecret, SALT_ROUNDS);

    const [user] = await this.db
      .insert(users)
      .values({
        tenantId,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        roleId: data.roleId || null,
        // Admin-supplied password → user is immediately active.
        // Invite flow → pending_verification until they set their own password.
        status: useInviteFlow ? 'pending_verification' : 'active',
        // For invited users we want passwordChangedAt to be NULL so the JWT
        // reset-token's iat doesn't trip the "already used" check in
        // AuthService.resetPassword(). The first password the user sets via
        // the activation link will populate passwordChangedAt.
        passwordChangedAt: useInviteFlow ? null : new Date(),
      })
      .returning({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: users.roleId,
        status: users.status,
        createdAt: users.createdAt,
      });

    const activationUrl = useInviteFlow
      ? this.buildActivationUrl(user.id, tenantId)
      : undefined;

    return { ...user, activationUrl };
  }

  /**
   * Re-issue an activation/reset link for an existing user. Admin presses
   * "Resend invite" or "Reset password" in the user detail UI. Returns the
   * URL for the admin to share — no email infrastructure required.
   */
  async issueResetLink(tenantId: string, userId: string): Promise<{ activationUrl: string }> {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    if (!user) throw new NotFoundException('User not found');
    return { activationUrl: this.buildActivationUrl(user.id, tenantId) };
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      roleId: string;
      status: 'active' | 'inactive' | 'locked' | 'pending_verification';
      preferences: Record<string, any>;
      avatarUrl: string;
    }>,
  ) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        roleId: users.roleId,
        status: users.status,
        avatarUrl: users.avatarUrl,
        updatedAt: users.updatedAt,
      });

    return updated;
  }

  async changePassword(
    tenantId: string,
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await this.db
      .update(users)
      .set({
        passwordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return { message: 'Password changed successfully' };
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.db
      .update(users)
      .set({ deletedAt: new Date(), status: 'inactive' })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));

    return { message: 'User deleted successfully' };
  }
}
