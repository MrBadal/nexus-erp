import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

export const notificationTypeEnum = pgEnum('notification_type', [
  'info',
  'success',
  'warning',
  'error',
  'invoice',
  'payment',
  'leave',
  'purchase',
  'inventory',
  'system',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  read: boolean('read').default(false).notNull(),
  type: notificationTypeEnum('type').default('info').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
