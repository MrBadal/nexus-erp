import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

// ─── Enums ──────────────────────────────────────────────

export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'replied',
  'resolved',
  'closed',
]);

export const ticketPriorityEnum = pgEnum('ticket_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const ticketSourceEnum = pgEnum('ticket_source', [
  'email',
  'phone',
  'web',
  'chat',
]);

export const kbArticleStatusEnum = pgEnum('kb_article_status', [
  'draft',
  'published',
  'archived',
]);

// ─── Tables ─────────────────────────────────────────────

export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  ticketNumber: varchar('ticket_number', { length: 50 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  description: text('description'),
  status: ticketStatusEnum('status').default('open').notNull(),
  priority: ticketPriorityEnum('priority').default('medium').notNull(),
  category: varchar('category', { length: 255 }),
  subCategory: varchar('sub_category', { length: 255 }),
  contactName: varchar('contact_name', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  assignedGroup: varchar('assigned_group', { length: 255 }),
  source: ticketSourceEnum('source').default('web').notNull(),
  resolution: text('resolution'),
  slaId: uuid('sla_id'),
  firstResponseDueAt: timestamp('first_response_due_at', { withTimezone: true }),
  resolutionDueAt: timestamp('resolution_due_at', { withTimezone: true }),
  slaBreached: boolean('sla_breached').default(false).notNull(),
  firstResponseTime: timestamp('first_response_time', { withTimezone: true }),
  resolutionTime: timestamp('resolution_time', { withTimezone: true }),
  satisfactionRating: integer('satisfaction_rating'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const ticketComments = pgTable('ticket_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  ticketId: uuid('ticket_id')
    .references(() => tickets.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  commentedBy: uuid('commented_by').references(() => users.id, { onDelete: 'set null' }),
  isInternal: boolean('is_internal').default(false).notNull(),
  attachments: text('attachments'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const slaPolicies = pgTable('sla_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  priority: ticketPriorityEnum('priority').notNull(),
  firstResponseHours: integer('first_response_hours').notNull(),
  resolutionHours: integer('resolution_hours').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  escalateTo: uuid('escalate_to').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const knowledgeBaseArticles = pgTable('knowledge_base_articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content'),
  category: varchar('category', { length: 255 }),
  tags: text('tags'),
  author: uuid('author').references(() => users.id, { onDelete: 'set null' }),
  status: kbArticleStatusEnum('status').default('draft').notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── Relations ──────────────────────────────────────────

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [tickets.tenantId],
    references: [tenants.id],
  }),
  assignee: one(users, {
    fields: [tickets.assignedTo],
    references: [users.id],
    relationName: 'ticketAssignee',
  }),
  creator: one(users, {
    fields: [tickets.createdBy],
    references: [users.id],
    relationName: 'ticketCreator',
  }),
  comments: many(ticketComments),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [ticketComments.tenantId],
    references: [tenants.id],
  }),
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
  commenter: one(users, {
    fields: [ticketComments.commentedBy],
    references: [users.id],
  }),
}));

export const slaPoliciesRelations = relations(slaPolicies, ({ one }) => ({
  tenant: one(tenants, {
    fields: [slaPolicies.tenantId],
    references: [tenants.id],
  }),
  escalateUser: one(users, {
    fields: [slaPolicies.escalateTo],
    references: [users.id],
  }),
}));

export const knowledgeBaseArticlesRelations = relations(knowledgeBaseArticles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [knowledgeBaseArticles.tenantId],
    references: [tenants.id],
  }),
  authorUser: one(users, {
    fields: [knowledgeBaseArticles.author],
    references: [users.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketComment = typeof ticketComments.$inferSelect;
export type NewTicketComment = typeof ticketComments.$inferInsert;
export type SlaPolicy = typeof slaPolicies.$inferSelect;
export type NewSlaPolicy = typeof slaPolicies.$inferInsert;
export type KnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferSelect;
export type NewKnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferInsert;
