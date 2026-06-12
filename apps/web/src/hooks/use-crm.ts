'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks, createStatusActionHook } from './create-crud-hooks';
import { post, endpoints } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Contact {
  id: string;
  tenantId: string;
  name: string;
  firstName: string;
  lastName: string;
  salutation: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  type: 'customer' | 'vendor' | 'lead';
  status: 'active' | 'inactive';
  source: 'website' | 'referral' | 'cold_call' | 'trade_show' | 'social_media' | 'other';
  assignedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  tenantId: string;
  title: string;
  contactId: string;
  contact: string;
  company: string;
  value: number;
  stage: string;
  probability: number;
  expectedClose: string;
  assignedTo: string;
  status: 'open' | 'won' | 'lost';
  createdAt: string;
  updatedAt: string;
}

export interface CrmActivity {
  id: string;
  tenantId: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  contactId: string;
  contact: string;
  dealId: string;
  deal: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Contacts – full CRUD
// ---------------------------------------------------------------------------

const contactCrud = createCrudHooks<Contact>('contacts', {
  list: endpoints.contacts.list,
  get: endpoints.contacts.get,
  create: endpoints.contacts.create,
  update: endpoints.contacts.update,
  delete: endpoints.contacts.delete,
});

export const useContacts = contactCrud.useList;
export const useContact = contactCrud.useById;
export const useCreateContact = contactCrud.useCreate;
export const useUpdateContact = contactCrud.useUpdate;
export const useDeleteContact = contactCrud.useDelete;
export const contactKeys = contactCrud.queryKeys;

// ---------------------------------------------------------------------------
// Deals – full CRUD + won / lost
// ---------------------------------------------------------------------------

const dealCrud = createCrudHooks<Deal>('deals', {
  list: endpoints.deals.list,
  get: endpoints.deals.get,
  create: endpoints.deals.create,
  update: endpoints.deals.update,
  delete: endpoints.deals.delete,
});

export const useDeals = dealCrud.useList;
export const useDeal = dealCrud.useById;
export const useCreateDeal = dealCrud.useCreate;
export const useUpdateDeal = dealCrud.useUpdate;
export const useDeleteDeal = dealCrud.useDelete;
export const dealKeys = dealCrud.queryKeys;

export const useWonDeal = createStatusActionHook<Deal>(
  'deals',
  'won',
  endpoints.deals.won,
);

export const useLostDeal = createStatusActionHook<Deal>(
  'deals',
  'lost',
  endpoints.deals.lost,
);

export interface ConvertDealToQuotationInput {
  dealId: string;
  customerId: string;
  validUntil: string;
  currency?: string;
  notes?: string;
}

export interface ConvertDealToQuotationResult {
  quotationId: string;
  quotationNumber: string;
  dealId: string;
  dealTitle: string;
  customerId: string;
  customerName: string;
  totalAmount: string;
}

export function useConvertDealToQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConvertDealToQuotationInput) => {
      const { dealId, ...body } = input;
      return post<ConvertDealToQuotationResult>(
        endpoints.deals.convertToQuotation(dealId),
        body,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Activities – full CRUD + complete
// ---------------------------------------------------------------------------

const activityCrud = createCrudHooks<CrmActivity>('activities', {
  list: endpoints.activities.list,
  get: endpoints.activities.get,
  create: endpoints.activities.create,
  update: endpoints.activities.update,
  delete: endpoints.activities.delete,
});

export const useActivities = activityCrud.useList;
export const useActivity = activityCrud.useById;
export const useCreateActivity = activityCrud.useCreate;
export const useUpdateActivity = activityCrud.useUpdate;
export const useDeleteActivity = activityCrud.useDelete;
export const activityKeys = activityCrud.queryKeys;

export const useCompleteActivity = createStatusActionHook<CrmActivity>(
  'activities',
  'complete',
  endpoints.activities.complete,
);

// ---------------------------------------------------------------------------
// Leads – full CRUD + convert
// ---------------------------------------------------------------------------

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  source: 'website' | 'referral' | 'social_media' | 'cold_call' | 'trade_show' | 'email_campaign' | 'advertisement' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
  score: number;
  estimatedValue: string;
  notes: string;
  address: string;
  city: string;
  state: string;
  country: string;
  assignedTo: string;
  convertedContactId: string;
  convertedDealId: string;
  convertedAt: string;
  lastContactedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConvertLeadInput {
  createDeal?: boolean;
  dealTitle?: string;
  dealValue?: string;
}

export interface ConvertLeadResult {
  leadId: string;
  contactId: string;
  dealId: string | null;
  status: string;
}

const leadCrud = createCrudHooks<Lead>('leads', {
  list: endpoints.leads.list,
  get: endpoints.leads.get,
  create: endpoints.leads.create,
  update: endpoints.leads.update,
  delete: endpoints.leads.delete,
});

export const useLeads = leadCrud.useList;
export const useLead = leadCrud.useById;
export const useCreateLead = leadCrud.useCreate;
export const useUpdateLead = leadCrud.useUpdate;
export const useDeleteLead = leadCrud.useDelete;
export const leadKeys = leadCrud.queryKeys;

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ConvertLeadInput & { id: string }) => {
      return post<ConvertLeadResult>(endpoints.leads.convert(id), body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
