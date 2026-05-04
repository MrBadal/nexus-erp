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
import { users } from './users';
import { employees } from './hr';

// ─── Enums ──────────────────────────────────────────────

export const employeeDocumentTypeEnum = pgEnum('employee_document_type', [
  'offer_letter',
  'contract',
  'id_proof',
  'certificate',
  'payslip_archive',
  'other',
]);

// ─── Tables ─────────────────────────────────────────────

export const employeeDocuments = pgTable(
  'employee_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    type: employeeDocumentTypeEnum('type').default('other').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    fileUrl: text('file_url').notNull(),
    fileSize: integer('file_size'),
    mimeType: varchar('mime_type', { length: 100 }),
    expiresAt: date('expires_at'),
    uploadedBy: uuid('uploaded_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    visibleToEmployee: boolean('visible_to_employee').default(true).notNull(),
    notes: text('notes'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('employee_documents_tenant_employee_idx').on(
      table.tenantId,
      table.employeeId,
    ),
    index('employee_documents_tenant_type_idx').on(table.tenantId, table.type),
  ],
);

export const employeeDocumentsRelations = relations(
  employeeDocuments,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [employeeDocuments.tenantId],
      references: [tenants.id],
    }),
    employee: one(employees, {
      fields: [employeeDocuments.employeeId],
      references: [employees.id],
    }),
    uploader: one(users, {
      fields: [employeeDocuments.uploadedBy],
      references: [users.id],
    }),
  }),
);

export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type NewEmployeeDocument = typeof employeeDocuments.$inferInsert;
