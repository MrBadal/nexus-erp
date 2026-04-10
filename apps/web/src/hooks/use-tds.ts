'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';
import { endpoints } from '@/lib/api';

export interface TdsSection {
  id: string;
  tenantId: string;
  section: string;
  description: string;
  rateIndividual: string;
  rateCompany: string;
  thresholdLimit: string;
  thresholdPeriod: 'annual' | 'per_transaction';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TdsDeduction {
  id: string;
  tenantId: string;
  billId: string;
  supplierId: string;
  tdsSectionId: string;
  grossAmount: string;
  tdsRate: string;
  tdsAmount: string;
  netAmount: string;
  deductionDate: string;
  fiscalYear: string;
  status: 'pending' | 'deducted' | 'deposited';
  certificateNumber: string | null;
  depositDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorTdsLedger {
  id: string;
  tenantId: string;
  supplierId: string;
  fiscalYear: string;
  cumulativePurchases: string;
  cumulativeTds: string;
  updatedAt: string;
}

export const tdsSectionKeys = {
  all: ['tdsSections'] as const,
  list: () => [...tdsSectionKeys.all, 'list'] as const,
  detail: (id: string) => [...tdsSectionKeys.all, id] as const,
};

export function useTdsSections() {
  return useQuery({
    queryKey: tdsSectionKeys.list(),
    queryFn: () => get<TdsSection[]>(endpoints.tdsSections.list),
    staleTime: 60_000,
  });
}

export function useTdsSection(id: string) {
  return useQuery({
    queryKey: tdsSectionKeys.detail(id),
    queryFn: () => get<TdsSection>(endpoints.tdsSections.get(id)),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateTdsSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TdsSection>) => post<TdsSection>(endpoints.tdsSections.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tdsSectionKeys.all });
    },
  });
}

export function useUpdateTdsSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<TdsSection>) =>
      put<TdsSection>(endpoints.tdsSections.update(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tdsSectionKeys.all });
    },
  });
}

export function useDeactivateTdsSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<TdsSection>(endpoints.tdsSections.deactivate(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tdsSectionKeys.all });
    },
  });
}

export function useSeedTdsSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => post<TdsSection[]>(endpoints.tdsSections.seedDefaults),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tdsSectionKeys.all });
    },
  });
}
