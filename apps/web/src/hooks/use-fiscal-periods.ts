'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { endpoints } from '@/lib/api';

export interface FiscalPeriod {
  id: string;
  tenantId: string;
  name: string;
  type: 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
  closedBy: string | null;
  closedAt: string | null;
  yearEndClosingDone: boolean;
  createdAt: string;
}

export const fiscalPeriodKeys = {
  all: ['fiscalPeriods'] as const,
  list: () => [...fiscalPeriodKeys.all, 'list'] as const,
  detail: (id: string) => [...fiscalPeriodKeys.all, id] as const,
};

export function useFiscalPeriods() {
  return useQuery({
    queryKey: fiscalPeriodKeys.list(),
    queryFn: () => get<FiscalPeriod[]>(endpoints.fiscalPeriods.list),
    staleTime: 60_000,
  });
}

export function useCreateFiscalPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string; startDate: string; endDate: string }) =>
      post<FiscalPeriod>(endpoints.fiscalPeriods.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.all });
    },
  });
}

export function useCloseFiscalPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post<FiscalPeriod>(endpoints.fiscalPeriods.close(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.all });
    },
  });
}

export function useReopenFiscalPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post<FiscalPeriod>(endpoints.fiscalPeriods.reopen(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.all });
    },
  });
}

export function useLockFiscalPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post<FiscalPeriod>(endpoints.fiscalPeriods.lock(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.all });
    },
  });
}
