'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';
import { endpoints } from '@/lib/api';

export interface TaxRate {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  rate: string;
  type: 'percentage' | 'fixed';
  scope: 'sales' | 'purchase' | 'both';
  isCompound: boolean;
  isInclusive: boolean;
  accountId: string | null;
  reportingCode: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const taxRateKeys = {
  all: ['taxRates'] as const,
  list: () => [...taxRateKeys.all, 'list'] as const,
  detail: (id: string) => [...taxRateKeys.all, id] as const,
};

export function useTaxRates() {
  return useQuery({
    queryKey: taxRateKeys.list(),
    queryFn: () => get<TaxRate[]>(endpoints.taxRates.list),
    staleTime: 60_000,
  });
}

export function useCreateTaxRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaxRate>) =>
      post<TaxRate>(endpoints.taxRates.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxRateKeys.all });
    },
  });
}

export function useUpdateTaxRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<TaxRate>) =>
      put<TaxRate>(endpoints.taxRates.update(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxRateKeys.all });
    },
  });
}

export function useDeactivateTaxRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post<TaxRate>(endpoints.taxRates.deactivate(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxRateKeys.all });
    },
  });
}
