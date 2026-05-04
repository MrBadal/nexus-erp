import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { employees } from './hr';

// ─── Gratuity Provisions ─────────────────────────────────
// Annual provisioning of gratuity liability per employee per FY.
// Computed as: (lastBasic × 15 ÷ 26) × completedYears, eligible when
// completedYears >= 5. Posting to GL is intentionally out of scope
// here — operators wire the journal entry separately.

export const gratuityProvisions = pgTable(
  'gratuity_provisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    fiscalYear: varchar('fiscal_year', { length: 10 }).notNull(), // e.g. "2025-26"
    lastBasic: decimal('last_basic', { precision: 20, scale: 4 }).default('0').notNull(),
    completedYears: decimal('completed_years', { precision: 6, scale: 2 }).default('0').notNull(),
    gratuityAmount: decimal('gratuity_amount', { precision: 20, scale: 4 }).default('0').notNull(),
    providedAt: timestamp('provided_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('gratuity_provisions_tenant_id_idx').on(table.tenantId),
    index('gratuity_provisions_tenant_employee_fy_idx').on(
      table.tenantId,
      table.employeeId,
      table.fiscalYear,
    ),
  ],
);

export const gratuityProvisionsRelations = relations(gratuityProvisions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [gratuityProvisions.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [gratuityProvisions.employeeId],
    references: [employees.id],
  }),
}));

export type GratuityProvision = typeof gratuityProvisions.$inferSelect;
export type NewGratuityProvision = typeof gratuityProvisions.$inferInsert;
