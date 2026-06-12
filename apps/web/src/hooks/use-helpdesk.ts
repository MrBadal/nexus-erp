'use client';

import { createCrudHooks, createStatusActionHook } from './create-crud-hooks';
import { endpoints } from '@/lib/api';

// ─── Tickets ────────────────────────────────────────────────────────────────

const ticketHooks = createCrudHooks('tickets', {
  list: endpoints.tickets.list,
  get: (id: string) => endpoints.tickets.get(id),
  create: endpoints.tickets.create,
  update: (id: string) => endpoints.tickets.update(id),
  delete: (id: string) => endpoints.tickets.delete(id),
});

export const useTickets = ticketHooks.useList;
export const useTicket = ticketHooks.useById;
export const useCreateTicket = ticketHooks.useCreate;
export const useUpdateTicket = ticketHooks.useUpdate;
export const useDeleteTicket = ticketHooks.useDelete;

export const useReplyTicket = createStatusActionHook('tickets', 'reply', (id) => endpoints.tickets.reply(id));
export const useResolveTicket = createStatusActionHook('tickets', 'resolve', (id) => endpoints.tickets.resolve(id));
export const useCloseTicket = createStatusActionHook('tickets', 'close', (id) => endpoints.tickets.close(id));
export const useReopenTicket = createStatusActionHook('tickets', 'reopen', (id) => endpoints.tickets.reopen(id));

// ─── Knowledge Base ─────────────────────────────────────────────────────────

const kbHooks = createCrudHooks('knowledgeBase', {
  list: endpoints.knowledgeBase.list,
  get: (id: string) => endpoints.knowledgeBase.get(id),
  create: endpoints.knowledgeBase.create,
  update: (id: string) => endpoints.knowledgeBase.update(id),
  delete: (id: string) => endpoints.knowledgeBase.delete(id),
});

export const useKnowledgeBaseArticles = kbHooks.useList;
export const useKnowledgeBaseArticle = kbHooks.useById;
export const useCreateKnowledgeBaseArticle = kbHooks.useCreate;
export const useUpdateKnowledgeBaseArticle = kbHooks.useUpdate;
export const useDeleteKnowledgeBaseArticle = kbHooks.useDelete;

// ─── SLA Policies ───────────────────────────────────────────────────────────

const slaHooks = createCrudHooks('slaPolicies', {
  list: endpoints.slaPolicies.list,
  get: (id: string) => endpoints.slaPolicies.get(id),
  create: endpoints.slaPolicies.create,
  update: (id: string) => endpoints.slaPolicies.update(id),
  delete: (id: string) => endpoints.slaPolicies.delete(id),
});

export const useSlaPolicies = slaHooks.useList;
export const useSlaPolicy = slaHooks.useById;
export const useCreateSlaPolicy = slaHooks.useCreate;
export const useUpdateSlaPolicy = slaHooks.useUpdate;
export const useDeleteSlaPolicy = slaHooks.useDelete;
