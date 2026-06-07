'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttendancePolicy {
  id: string;
  tenantId: string;
  name: string;
  graceMinutes: number;
  lateThresholdMinutes: number;
  deductionPerInstance: string;
  monthlyToleranceCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAttendancePolicyPayload {
  name: string;
  graceMinutes?: number;
  lateThresholdMinutes?: number;
  deductionPerInstance?: string;
  monthlyToleranceCount?: number;
  isActive?: boolean;
}

export interface UpdateAttendancePolicyPayload extends Partial<CreateAttendancePolicyPayload> {}

export interface LateDeductionResult {
  lateInstances: number;
  deductibleInstances: number;
  deductionAmount: number;
  policyId: string | null;
  policyName: string | null;
  details: Array<{
    date: string;
    checkInMinutes: number;
    shiftStartMinutes: number;
    minutesLate: number;
    isLate: boolean;
    isDeductible: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const attendancePolicyKeys = {
  all: ['attendance-policies'] as const,
  lists: () => [...attendancePolicyKeys.all, 'list'] as const,
  active: () => [...attendancePolicyKeys.all, 'active'] as const,
  detail: (id: string) => [...attendancePolicyKeys.all, 'detail', id] as const,
  deductions: (employeeId: string, year: number, month: number) =>
    [...attendancePolicyKeys.all, 'deductions', employeeId, year, month] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAttendancePolicies() {
  return useQuery({
    queryKey: attendancePolicyKeys.lists(),
    queryFn: () => get<AttendancePolicy[]>('/hr/attendance-policies'),
  });
}

export function useActiveAttendancePolicy() {
  return useQuery({
    queryKey: attendancePolicyKeys.active(),
    queryFn: () => get<AttendancePolicy | null>('/hr/attendance-policies/active'),
  });
}

export function useAttendancePolicy(id: string | undefined) {
  return useQuery({
    queryKey: attendancePolicyKeys.detail(id ?? ''),
    queryFn: () => get<AttendancePolicy>(`/hr/attendance-policies/${id}`),
    enabled: Boolean(id),
  });
}

export function useLateDeductions(
  employeeId: string | undefined,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: attendancePolicyKeys.deductions(employeeId ?? '', year, month),
    queryFn: () =>
      get<LateDeductionResult>(
        `/hr/attendance-policies/compute-deductions/${employeeId}?year=${year}&month=${month}`,
      ),
    enabled: Boolean(employeeId),
  });
}

export function useCreateAttendancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAttendancePolicyPayload) =>
      post<AttendancePolicy>('/hr/attendance-policies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendancePolicyKeys.all });
    },
  });
}

export function useUpdateAttendancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttendancePolicyPayload }) =>
      put<AttendancePolicy>(`/hr/attendance-policies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendancePolicyKeys.all });
    },
  });
}

export function useDeleteAttendancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ message: string }>(`/hr/attendance-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendancePolicyKeys.all });
    },
  });
}
