'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RegularizationStatus = 'pending' | 'approved' | 'rejected';

export type RequestedAttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'late'
  | 'on_leave';

export interface AttendanceRegularization {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  requestedStatus: RequestedAttendanceStatus;
  reason: string;
  status: RegularizationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  // Enriched
  employee?: string;
  empId?: string;
}

export interface CreateRegularizationPayload {
  date: string;
  requestedStatus: RequestedAttendanceStatus;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const regularizationKeys = {
  all: ['attendance-regularizations'] as const,
  list: (filters?: { status?: string; employeeId?: string }) =>
    [...regularizationKeys.all, 'list', filters ?? {}] as const,
  mine: () => [...regularizationKeys.all, 'mine'] as const,
};

// ---------------------------------------------------------------------------
// HR hooks
// ---------------------------------------------------------------------------

export function useRegularizations(filters?: {
  status?: string;
  employeeId?: string;
}) {
  return useQuery({
    queryKey: regularizationKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.employeeId) params.set('employeeId', filters.employeeId);
      const qs = params.toString();
      return get<AttendanceRegularization[]>(
        `/hr/attendance-regularizations${qs ? `?${qs}` : ''}`,
      );
    },
  });
}

export function useApproveRegularization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) =>
      post<AttendanceRegularization>(
        `/hr/attendance-regularizations/${id}/approve`,
        { reviewNotes },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regularizationKeys.all });
    },
  });
}

export function useRejectRegularization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) =>
      post<AttendanceRegularization>(
        `/hr/attendance-regularizations/${id}/reject`,
        { reviewNotes },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regularizationKeys.all });
    },
  });
}

export function useDeleteRegularization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ message: string }>(`/hr/attendance-regularizations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regularizationKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// ESS hooks
// ---------------------------------------------------------------------------

export function useMyRegularizations() {
  return useQuery({
    queryKey: regularizationKeys.mine(),
    queryFn: () =>
      get<AttendanceRegularization[]>('/ess/attendance/regularizations'),
  });
}

export function useRequestRegularization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRegularizationPayload) =>
      post<AttendanceRegularization>('/ess/attendance/regularizations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regularizationKeys.mine() });
    },
  });
}
