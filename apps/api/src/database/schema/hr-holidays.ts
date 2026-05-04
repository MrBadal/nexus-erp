import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';

// ─── Enums ──────────────────────────────────────────────

export const holidayTypeEnum = pgEnum('holiday_type', [
  'national',
  'state',
  'company',
  'restricted',
]);

// ─── Tables ─────────────────────────────────────────────

export const holidays = pgTable(
  'holidays',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    date: date('date').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: holidayTypeEnum('type').notNull().default('company'),
    regions: text('regions').array(),
    isRecurring: boolean('is_recurring').default(false).notNull(),
    year: integer('year').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantYearIdx: index('holidays_tenant_year_idx').on(table.tenantId, table.year),
    tenantDateIdx: index('holidays_tenant_date_idx').on(table.tenantId, table.date),
  }),
);

export const holidaysRelations = relations(holidays, ({ one }) => ({
  tenant: one(tenants, {
    fields: [holidays.tenantId],
    references: [tenants.id],
  }),
}));

export type Holiday = typeof holidays.$inferSelect;
export type NewHoliday = typeof holidays.$inferInsert;
