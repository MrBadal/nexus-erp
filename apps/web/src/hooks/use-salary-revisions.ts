'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SalaryRevision {
  id: string;
  tenantId: string;
  employeeId: string;
  effectiveDate: string;
  previousCtc: string | null;
  newCtc: string;
  revisionPercent: string | null;
  reason: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalaryRevisionPayload {
  employeeId: string;
  effectiveDate: string;
  previousCtc?: string;
  newCtc: string;
  revisionPercent?: string;
  reason?: string;
  approvedBy?: string;
}

export interface UpdateSalaryRevisionPayload
  extends Partial<CreateSalaryRevisionPayload> {}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const salaryRevisionKeys = {
  all: ['salary-revisions'] as const,
  lists: () => [...salaryRevisionKeys.all, 'list'] as const,
  list: (employeeId?: string) =>
    [...salaryRevisionKeys.lists(), employeeId ?? 'all'] as const,
  detail: (id: string) => [...salaryRevisionKeys.all, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useSalaryRevisions(employeeId?: string) {
  return useQuery({
    queryKey: salaryRevisionKeys.list(employeeId),
    queryFn: () =>
      get<SalaryRevision[]>(
        employeeId
          ? `/hr/salary-revisions?employeeId=${employeeId}`
          : '/hr/salary-revisions',
      ),
  });
}

export function useSalaryRevision(id: string | undefined) {
  return useQuery({
    queryKey: salaryRevisionKeys.detail(id ?? ''),
    queryFn: () => get<SalaryRevision>(`/hr/salary-revisions/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSalaryRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSalaryRevisionPayload) =>
      post<SalaryRevision>('/hr/salary-revisions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryRevisionKeys.all });
    },
  });
}

export function useUpdateSalaryRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSalaryRevisionPayload;
    }) => put<SalaryRevision>(`/hr/salary-revisions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryRevisionKeys.all });
    },
  });
}

export function useDeleteSalaryRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: true }>(`/hr/salary-revisions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryRevisionKeys.all });
    },
  });
}
