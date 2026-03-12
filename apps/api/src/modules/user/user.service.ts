import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { users, type NewUser } from '../../database/schema/index.js';

const SALT_ROUNDS = 12;

@Injectable()
export class UserService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

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
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      roleId?: string;
    },
  ) {
    // Check email uniqueness within tenant
    const existing = await this.findByEmail(tenantId, data.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists in this tenant');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

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
        status: 'pending_verification',
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

    return user;
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
