import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { employees } from './hr';

/**
 * Asset assignments to employees.
 *
 * NOTE: assetId is intentionally a plain uuid (no `.references()`) to avoid
 * a cross-schema import from `assets.ts` here. Referential integrity for
 * the asset is enforced at the service layer.
 */
export const assetAssignments = pgTable(
  'asset_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    assetId: uuid('asset_id').notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    returnedAt: timestamp('returned_at', { withTimezone: true }),
    conditionAtAssign: varchar('condition_at_assign', { length: 50 }),
    conditionAtReturn: varchar('condition_at_return', { length: 50 }),
    notes: text('notes'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('asset_assignments_tenant_asset_idx').on(table.tenantId, table.assetId),
    index('asset_assignments_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
  ],
);

export const assetAssignmentsRelations = relations(assetAssignments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [assetAssignments.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [assetAssignments.employeeId],
    references: [employees.id],
  }),
}));

export type AssetAssignment = typeof assetAssignments.$inferSelect;
export type NewAssetAssignment = typeof assetAssignments.$inferInsert;
