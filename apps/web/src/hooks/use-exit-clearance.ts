'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FinalSettlement {
  id: string;
  tenantId: string;
  exitClearanceId: string;
  employeeId: string;
  gratuityAmount: string;
  leaveEncashment: string;
  pendingSalary: string;
  bonusAmount: string;
  deductions: string;
  netPayable: string;
  settledDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExitClearance {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string | null;
  employeeCode?: string | null;
  resignationDate: string | null;
  lastWorkingDate: string | null;
  reason: string | null;
  status: 'in_progress' | 'cleared' | 'settled' | 'cancelled';
  itCleared: boolean;
  financeCleared: boolean;
  hrCleared: boolean;
  adminCleared: boolean;
  managerCleared: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  finalSettlement?: FinalSettlement | null;
}

export interface CreateExitClearancePayload {
  employeeId: string;
  resignationDate?: string;
  lastWorkingDate?: string;
  reason?: string;
  notes?: string;
}

export interface UpdateExitClearancePayload {
  resignationDate?: string;
  lastWorkingDate?: string;
  reason?: string;
  itCleared?: boolean;
  financeCleared?: boolean;
  hrCleared?: boolean;
  adminCleared?: boolean;
  managerCleared?: boolean;
  notes?: string;
}

export interface SettlePayload {
  gratuityAmount?: string;
  leaveEncashment?: string;
  pendingSalary?: string;
  bonusAmount?: string;
  deductions?: string;
  settledDate?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const exitClearanceKeys = {
  all: ['exit-clearances'] as const,
  lists: () => [...exitClearanceKeys.all, 'list'] as const,
  list: (filters: { status?: string; employeeId?: string }) =>
    [...exitClearanceKeys.lists(), filters] as const,
  detail: (id: string) => [...exitClearanceKeys.all, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useExitClearances(filters?: {
  status?: string;
  employeeId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.employeeId) params.set('employeeId', filters.employeeId);
  const qs = params.toString();

  return useQuery({
    queryKey: exitClearanceKeys.list(filters ?? {}),
    queryFn: () => get<ExitClearance[]>(`${endpoints.exitClearances.list}${qs ? `?${qs}` : ''}`),
  });
}

export function useExitClearance(id: string | undefined) {
  return useQuery({
    queryKey: exitClearanceKeys.detail(id ?? ''),
    queryFn: () => get<ExitClearance>(endpoints.exitClearances.get(id!)),
    enabled: Boolean(id),
  });
}

export function useCreateExitClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExitClearancePayload) =>
      post<ExitClearance>(endpoints.exitClearances.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exitClearanceKeys.all });
    },
  });
}

export function useUpdateExitClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExitClearancePayload }) =>
      put<ExitClearance>(endpoints.exitClearances.update(id), data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: exitClearanceKeys.all });
      queryClient.invalidateQueries({
        queryKey: exitClearanceKeys.detail(vars.id),
      });
    },
  });
}

export function useSettleExitClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SettlePayload }) =>
      post<ExitClearance>(endpoints.exitClearances.settle(id), data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: exitClearanceKeys.all });
      queryClient.invalidateQueries({
        queryKey: exitClearanceKeys.detail(vars.id),
      });
    },
  });
}

export function useDeleteExitClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<{ message: string }>(endpoints.exitClearances.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exitClearanceKeys.all });
    },
  });
}
