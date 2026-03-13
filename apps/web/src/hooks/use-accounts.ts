'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints } from '@/lib/api';

export interface Account {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  accountType: string;
  normalBalance: string;
  financialStatement: string;
  parentId: string | null;
  currencyCode: string;
  description: string | null;
  isActive: boolean;
  isHeader: boolean;
  isSystem: boolean;
  openingBalance: string;
  currentBalance: string;
  taxRateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountTreeNode extends Account {
  children: AccountTreeNode[];
}

export interface AccountFilters {
  type?: string;
  active?: boolean;
}

export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  list: (filters?: AccountFilters) => [...accountKeys.lists(), filters] as const,
  tree: () => [...accountKeys.all, 'tree'] as const,
  details: () => [...accountKeys.all, 'detail'] as const,
  detail: (id: string) => [...accountKeys.details(), id] as const,
};

export function useAccounts(filters?: AccountFilters) {
  return useQuery({
    queryKey: accountKeys.list(filters),
    queryFn: async () => {
      return get<Account[]>(endpoints.accounts.list);
    },
  });
}

export function useAccountTree() {
  return useQuery({
    queryKey: accountKeys.tree(),
    queryFn: async () => {
      return get<AccountTreeNode[]>(endpoints.accounts.tree);
    },
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: async () => {
      return get<Account>(endpoints.accounts.get(id));
    },
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Account>) => {
      return post<Account>(endpoints.accounts.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
      return put<Account>(endpoints.accounts.update(id), data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.tree() });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await del(endpoints.accounts.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}
