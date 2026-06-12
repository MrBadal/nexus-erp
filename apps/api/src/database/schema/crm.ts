import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  boolean,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

// ─── Enums ──────────────────────────────────────────────

export const contactTypeEnum = pgEnum('contact_type', [
  'customer',
  'vendor',
  'lead',
  'both',
]);

export const contactStatusEnum = pgEnum('contact_status', [
  'active',
  'inactive',
]);

export const contactSourceEnum = pgEnum('contact_source', [
  'website',
  'referral',
  'cold_call',
  'trade_show',
  'social_media',
  'other',
]);

export const dealStageValueEnum = pgEnum('deal_stage_value', [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'call',
  'email',
  'meeting',
  'task',
  'note',
]);

export const activityStatusEnum = pgEnum('activity_status', [
  'pending',
  'completed',
  'cancelled',
]);

export const activityPriorityEnum = pgEnum('activity_priority', [
  'low',
  'medium',
  'high',
]);

export const campaignTypeEnum = pgEnum('campaign_type', [
  'email',
  'social',
  'event',
  'referral',
]);

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'active',
  'paused',
  'completed',
]);

// ─── Tables ─────────────────────────────────────────────

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  type: contactTypeEnum('type').default('lead').notNull(),
  salutation: varchar('salutation', { length: 20 }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  mobile: varchar('mobile', { length: 50 }),
  company: varchar('company', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  website: varchar('website', { length: 500 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  source: contactSourceEnum('source'),
  status: contactStatusEnum('status').default('active').notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  tags: text('tags').array(),
  notes: text('notes'),
  imageUrl: varchar('image_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('contacts_tenant_id_idx').on(table.tenantId),
  index('contacts_tenant_id_type_idx').on(table.tenantId, table.type),
]);

export const contactGroups = pgTable('contact_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const contactGroupMembers = pgTable('contact_group_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id')
    .references(() => contacts.id, { onDelete: 'cascade' })
    .notNull(),
  groupId: uuid('group_id')
    .references(() => contactGroups.id, { onDelete: 'cascade' })
    .notNull(),
});

export const dealStages = pgTable('deal_stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  order: integer('order').notNull(),
  probability: integer('probability').default(0).notNull(),
  color: varchar('color', { length: 20 }),
  isDefault: boolean('is_default').default(false).notNull(),
  isWon: boolean('is_won').default(false).notNull(),
  isLost: boolean('is_lost').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const deals = pgTable('deals', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  value: decimal('value', { precision: 20, scale: 4 }),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  stage: dealStageValueEnum('stage').default('lead').notNull(),
  stageId: uuid('stage_id').references(() => dealStages.id, { onDelete: 'set null' }),
  probability: integer('probability').default(0),
  expectedCloseDate: date('expected_close_date'),
  actualCloseDate: date('actual_close_date'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  source: contactSourceEnum('source'),
  description: text('description'),
  lostReason: text('lost_reason'),
  wonReason: text('won_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('deals_tenant_id_idx').on(table.tenantId),
  index('deals_tenant_id_stage_idx').on(table.tenantId, table.stage),
]);

export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  type: activityTypeEnum('type').notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description'),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: activityStatusEnum('status').default('pending').notNull(),
  priority: activityPriorityEnum('priority').default('medium').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: campaignTypeEnum('type').notNull(),
  status: campaignStatusEnum('status').default('draft').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  budget: decimal('budget', { precision: 20, scale: 4 }),
  actualCost: decimal('actual_cost', { precision: 20, scale: 4 }),
  targetAudience: text('target_audience'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ─── Relations ──────────────────────────────────────────

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [contacts.tenantId],
    references: [tenants.id],
  }),
  assignee: one(users, {
    fields: [contacts.assignedTo],
    references: [users.id],
  }),
  groupMembers: many(contactGroupMembers),
  deals: many(deals),
  activities: many(activities),
}));

export const contactGroupsRelations = relations(contactGroups, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [contactGroups.tenantId],
    references: [tenants.id],
  }),
  members: many(contactGroupMembers),
}));

export const contactGroupMembersRelations = relations(contactGroupMembers, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactGroupMembers.contactId],
    references: [contacts.id],
  }),
  group: one(contactGroups, {
    fields: [contactGroupMembers.groupId],
    references: [contactGroups.id],
  }),
}));

export const dealStagesRelations = relations(dealStages, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [dealStages.tenantId],
    references: [tenants.id],
  }),
  deals: many(deals),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [deals.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  dealStage: one(dealStages, {
    fields: [deals.stageId],
    references: [dealStages.id],
  }),
  assignee: one(users, {
    fields: [deals.assignedTo],
    references: [users.id],
  }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  tenant: one(tenants, {
    fields: [activities.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [activities.contactId],
    references: [contacts.id],
  }),
  deal: one(deals, {
    fields: [activities.dealId],
    references: [deals.id],
  }),
  assignee: one(users, {
    fields: [activities.assignedTo],
    references: [users.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  tenant: one(tenants, {
    fields: [campaigns.tenantId],
    references: [tenants.id],
  }),
}));

// ─── Leads ─────────────────────────────────────────────

export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'converted',
  'lost',
]);

export const leadSourceEnum = pgEnum('lead_source', [
  'website',
  'referral',
  'social_media',
  'cold_call',
  'trade_show',
  'email_campaign',
  'advertisement',
  'other',
]);

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  source: leadSourceEnum('source').default('other').notNull(),
  status: leadStatusEnum('status').default('new').notNull(),
  score: integer('score').default(0).notNull(),
  estimatedValue: decimal('estimated_value', { precision: 20, scale: 4 }),
  notes: text('notes'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  convertedContactId: uuid('converted_contact_id'),
  convertedDealId: uuid('converted_deal_id'),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const leadsRelations = relations(leads, ({ one }) => ({
  tenant: one(tenants, {
    fields: [leads.tenantId],
    references: [tenants.id],
  }),
  assignee: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactGroup = typeof contactGroups.$inferSelect;
export type NewContactGroup = typeof contactGroups.$inferInsert;
export type ContactGroupMember = typeof contactGroupMembers.$inferSelect;
export type NewContactGroupMember = typeof contactGroupMembers.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type DealStage = typeof dealStages.$inferSelect;
export type NewDealStage = typeof dealStages.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
