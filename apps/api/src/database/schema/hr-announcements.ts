import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { employees } from './hr';

// ─── Enums ──────────────────────────────────────────────

export const announcementAudienceScopeEnum = pgEnum('announcement_audience_scope', [
  'tenant',
  'department',
  'designation',
  'specific',
]);

// ─── Announcements ─────────────────────────────────────

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    audienceScope: announcementAudienceScopeEnum('audience_scope')
      .default('tenant')
      .notNull(),
    /**
     * Polymorphic id list. Interpretation depends on `audienceScope`:
     *   - 'tenant'      -> ignored / null
     *   - 'department'  -> array of department ids
     *   - 'designation' -> array of designation ids
     *   - 'specific'    -> array of employee ids
     */
    audienceIds: uuid('audience_ids').array(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('announcements_tenant_idx').on(table.tenantId),
    publishedIdx: index('announcements_published_idx').on(table.publishedAt),
  }),
);

export const announcementsRelations = relations(announcements, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [announcements.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [announcements.createdBy],
    references: [users.id],
  }),
  reads: many(announcementReads),
}));

// ─── Read Tracking ─────────────────────────────────────

export const announcementReads = pgTable(
  'announcement_reads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    announcementId: uuid('announcement_id')
      .references(() => announcements.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    readAt: timestamp('read_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqRead: uniqueIndex('announcement_reads_unique_idx').on(
      table.announcementId,
      table.employeeId,
    ),
    employeeIdx: index('announcement_reads_employee_idx').on(table.employeeId),
  }),
);

export const announcementReadsRelations = relations(announcementReads, ({ one }) => ({
  announcement: one(announcements, {
    fields: [announcementReads.announcementId],
    references: [announcements.id],
  }),
  employee: one(employees, {
    fields: [announcementReads.employeeId],
    references: [employees.id],
  }),
}));

// ─── Inferred Types ─────────────────────────────────────

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type AnnouncementRead = typeof announcementReads.$inferSelect;
export type NewAnnouncementRead = typeof announcementReads.$inferInsert;
