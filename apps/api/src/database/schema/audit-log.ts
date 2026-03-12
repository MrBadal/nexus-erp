import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  timestamp,
  jsonb,
  bigserial,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'export',
  'import',
  'approve',
  'reject',
  'post',
  'reverse',
  'send',
  'void',
  'archive',
]);

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: auditActionEnum('action').notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id'),
  changes: jsonb('changes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
