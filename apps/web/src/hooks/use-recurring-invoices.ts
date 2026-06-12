'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, endpoints, buildQueryString } from '@/lib/api';

export interface RecurringInvoiceTemplate {
  id: string;
  tenantId: string;
  sourceInvoiceId: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'annually';
  nextRunDate: string;
  endDate: string | null;
  isActive: boolean;
  totalGenerated: number;
  lastGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringInvoiceData {
  sourceInvoiceId: string;
  frequency: RecurringInvoiceTemplate['frequency'];
  nextRunDate: string;
  endDate?: string;
}

export interface UpdateRecurringInvoiceData {
  frequency?: RecurringInvoiceTemplate['frequency'];
  nextRunDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export const recurringInvoiceKeys = {
  all: ['recurring-invoices'] as const,
  lists: () => [...recurringInvoiceKeys.all, 'list'] as const,
  list: (filters?: Record<string, string | number | boolean | undefined | null>) =>
    [...recurringInvoiceKeys.lists(), filters] as const,
  details: () => [...recurringInvoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...recurringInvoiceKeys.details(), id] as const,
};

export function useRecurringInvoices() {
  return useQuery({
    queryKey: recurringInvoiceKeys.lists(),
    queryFn: async () => {
      return get<RecurringInvoiceTemplate[]>(endpoints.recurringInvoices.list);
    },
  });
}

export function useCreateRecurringInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRecurringInvoiceData) => {
      return post<RecurringInvoiceTemplate>(endpoints.recurringInvoices.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringInvoiceKeys.lists() });
    },
  });
}

export function useUpdateRecurringInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRecurringInvoiceData }) => {
      return put<RecurringInvoiceTemplate>(endpoints.recurringInvoices.update(id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringInvoiceKeys.lists() });
    },
  });
}

export function useDeactivateRecurringInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<RecurringInvoiceTemplate>(endpoints.recurringInvoices.deactivate(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringInvoiceKeys.lists() });
    },
  });
}
