'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks, createStatusActionHook } from './create-crud-hooks';
import { get, post, endpoints, buildQueryString } from '@/lib/api';

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
  assignedTo: string | null;
  ownerName?: string | null;
  priority: 'low' | 'medium' | 'high';
  nextFollowUpAt: string | null;
  lastDisposition: Disposition | null;
  callAttempts: number;
  lostReason: string | null;
  convertedContactId: string;
  convertedDealId: string;
  convertedAt: string;
  lastContactedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type Disposition =
  | 'connected' | 'no_answer' | 'busy' | 'switched_off' | 'wrong_number'
  | 'callback' | 'interested' | 'not_interested' | 'do_not_call' | 'converted';

export interface LeadActivity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  disposition: Disposition | null;
  direction: 'inbound' | 'outbound' | null;
  durationMinutes: number | null;
  status: string;
  completedAt: string | null;
  dueDate: string | null;
  createdAt: string;
  byName: string | null;
}

export interface LogCallInput {
  disposition: Disposition;
  notes?: string;
  durationMinutes?: number;
  direction?: 'inbound' | 'outbound';
  nextFollowUpAt?: string;
  status?: string;
}

export interface QueueCounts {
  dueToday: number;
  overdue: number;
  newUnassigned: number;
  mine: number;
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

// ─── Telecalling: work queue, call logging, assignment ──────────────

export interface LeadQueueParams {
  status?: string;
  source?: string;
  priority?: string;
  search?: string;
  mine?: boolean;
  assignedTo?: string;
  followUpDue?: 'overdue' | 'today' | 'week';
  sort?: 'recent' | 'followup';
  limit?: number;
  offset?: number;
}

/** Owner-scoped lead list with telecaller work-queue filters. */
export function useLeadQueue(params?: LeadQueueParams) {
  return useQuery({
    queryKey: ['leads', 'queue', params],
    queryFn: () =>
      get<Lead[]>(
        `${endpoints.leads.list}${buildQueryString((params ?? {}) as Record<string, string | number | boolean | undefined | null>)}`,
      ),
  });
}

export function useLeadQueueCounts() {
  return useQuery({
    queryKey: ['leads', 'queue-counts'],
    queryFn: () => get<QueueCounts>(endpoints.leads.queueCounts),
  });
}

export function useLeadActivities(id: string | undefined) {
  return useQuery({
    queryKey: ['leads', 'activities', id],
    queryFn: () => get<LeadActivity[]>(endpoints.leads.activities(id!)),
    enabled: !!id,
  });
}

export function useLogCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: LogCallInput & { id: string }) =>
      post<Lead>(endpoints.leads.logCall(id), body),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads', 'activities', id] });
    },
  });
}

export function useAssignLeadToMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<Lead>(endpoints.leads.assignToMe(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useAssignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string | null }) =>
      post<Lead>(endpoints.leads.assign(id), { assignedTo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export interface ImportLeadRow {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  priority?: string;
  notes?: string;
  city?: string;
  state?: string;
}

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; name: string; reason: string }[];
}

export function useImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { leads: ImportLeadRow[]; assignTo?: string | null | 'round_robin' }) =>
      post<ImportResult>(endpoints.leads.import, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

// ─── Lead Finder: registry discovery + enrichment ──────────────────

export interface LeadCandidate {
  id: string;
  source: string;
  name: string;
  city: string | null;
  state: string | null;
  cin: string | null;
  companyStatus: string | null;
  registrationDate: string | null;
  address: string | null;
  status: 'new' | 'imported' | 'rejected';
  createdAt: string;
}

export interface DiscoverResult {
  state: string;
  totalAgriInState: number;
  scanned: number;
  producersFound: number;
  created: number;
  alreadyHave: number;
  enriched: number;
  nextOffset: number;
  hasMore: boolean;
}

export interface CandidateCounts {
  new: number;
  imported: number;
  rejected: number;
}

export function useFinderStates() {
  return useQuery({
    queryKey: ['lead-finder', 'states'],
    queryFn: () => get<string[]>(endpoints.leadFinder.states),
    staleTime: 60 * 60 * 1000,
  });
}

export function useCandidates(params?: { status?: string; state?: string; search?: string }) {
  return useQuery({
    queryKey: ['lead-finder', 'candidates', params],
    queryFn: () =>
      get<LeadCandidate[]>(
        `${endpoints.leadFinder.candidates}${buildQueryString((params ?? {}) as Record<string, string | undefined>)}`,
      ),
  });
}

export function useCandidateCounts() {
  return useQuery({
    queryKey: ['lead-finder', 'candidate-counts'],
    queryFn: () => get<CandidateCounts>(endpoints.leadFinder.candidateCounts),
  });
}

export function useDiscoverLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { state: string; maxScan?: number; offset?: number }) =>
      post<DiscoverResult>(endpoints.leadFinder.discover, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-finder'] });
    },
  });
}

export function useApproveCandidates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[]; assignTo?: string | null | 'round_robin' }) =>
      post<{ approved: number; skipped: number }>(endpoints.leadFinder.approve, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-finder'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useRejectCandidates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: string[] }) =>
      post<{ rejected: number }>(endpoints.leadFinder.reject, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lead-finder'] }),
  });
}

export function useEnrichState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { state: string }) =>
      post<{ state: string; leadsInState: number; updated: number; struckOff: number }>(
        endpoints.leadFinder.enrich,
        body,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}
