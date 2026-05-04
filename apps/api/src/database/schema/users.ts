import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { roles } from './roles';

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'locked',
  'pending_verification',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  avatarUrl: text('avatar_url'),
  phone: varchar('phone', { length: 20 }),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
  // Bridge to HR. Plain uuid (no .references()) to avoid circular import with employees table.
  // Foreign key enforced at DB level via migration.
  employeeId: uuid('employee_id'),
  status: userStatusEnum('status').default('pending_verification').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
  mfaSecret: varchar('mfa_secret', { length: 255 }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }).defaultNow(),
  preferences: jsonb('preferences').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
