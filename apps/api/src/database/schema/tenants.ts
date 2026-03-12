import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

export const tenantStatusEnum = pgEnum('tenant_status', [
  'active',
  'suspended',
  'trial',
  'cancelled',
]);

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  domain: varchar('domain', { length: 255 }).unique(),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  primaryColor: varchar('primary_color', { length: 7 }).default('#1B4F72'),
  secondaryColor: varchar('secondary_color', { length: 7 }).default('#2874A6'),
  planId: uuid('plan_id'),
  status: tenantStatusEnum('status').default('trial').notNull(),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  settings: jsonb('settings').default({}).notNull(),
  billingEmail: varchar('billing_email', { length: 255 }).notNull(),
  maxUsers: integer('max_users').notNull().default(5),
  storageLimitGb: integer('storage_limit_gb').notNull().default(5),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
