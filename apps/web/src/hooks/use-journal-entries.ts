'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints, buildQueryString } from '@/lib/api';
import { accountKeys } from './use-accounts';

export interface JournalLine {
  id: string;
  lineNumber: number;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  description: string | null;
  debitAmount: string;
  creditAmount: string;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  entryNumber: string;
  date: string;
  postedDate: string | null;
  reference: string | null;
  description: string | null;
  sourceType: string;
  status: 'draft' | 'posted' | 'reversed';
  totalDebit: string;
  totalCredit: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines?: JournalLine[];
}

export interface JournalEntryFilters {
  status?: string;
  limit?: number;
  offset?: number;
}

export const journalEntryKeys = {
  all: ['journal-entries'] as const,
  lists: () => [...journalEntryKeys.all, 'list'] as const,
  list: (filters?: JournalEntryFilters) => [...journalEntryKeys.lists(), filters] as const,
  details: () => [...journalEntryKeys.all, 'detail'] as const,
  detail: (id: string) => [...journalEntryKeys.details(), id] as const,
};

export function useJournalEntries(filters?: JournalEntryFilters) {
  return useQuery({
    queryKey: journalEntryKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<JournalEntry[]>(`${endpoints.journalEntries.list}${qs}`);
    },
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: journalEntryKeys.detail(id),
    queryFn: async () => {
      return get<JournalEntry>(endpoints.journalEntries.get(id));
    },
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<JournalEntry> & { lines: Partial<JournalLine>[] }) => {
      return post<JournalEntry>(endpoints.journalEntries.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalEntryKeys.lists() });
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<JournalEntry> }) => {
      return put<JournalEntry>(endpoints.journalEntries.update(id), data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: journalEntryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: journalEntryKeys.lists() });
    },
  });
}

export function usePostJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<JournalEntry>(endpoints.journalEntries.post(id));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: journalEntryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: journalEntryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useReverseJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<JournalEntry>(endpoints.journalEntries.reverse(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalEntryKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await del(endpoints.journalEntries.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalEntryKeys.lists() });
    },
  });
}
