'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Shift {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  weekendDays: number[];
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface ShiftAssignment {
  id: string;
  tenantId: string;
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  employeeFirstName?: string | null;
  employeeLastName?: string | null;
  employeeCode?: string | null;
  shiftName?: string | null;
  shiftCode?: string | null;
}

export interface CreateShiftPayload {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  weekendDays?: number[];
  isActive?: boolean;
}

export interface UpdateShiftPayload extends Partial<CreateShiftPayload> {}

export interface AssignShiftPayload {
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const shiftKeys = {
  all: ['shifts'] as const,
  lists: () => [...shiftKeys.all, 'list'] as const,
  detail: (id: string) => [...shiftKeys.all, 'detail', id] as const,
  assignments: (params?: { shiftId?: string; employeeId?: string }) =>
    [...shiftKeys.all, 'assignments', params ?? {}] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useShifts() {
  return useQuery({
    queryKey: shiftKeys.lists(),
    queryFn: () => get<Shift[]>('/hr/shifts'),
  });
}

export function useShift(id: string | undefined) {
  return useQuery({
    queryKey: shiftKeys.detail(id ?? ''),
    queryFn: () => get<Shift>(`/hr/shifts/${id}`),
    enabled: Boolean(id),
  });
}

export function useShiftAssignments(params?: { shiftId?: string; employeeId?: string }) {
  return useQuery({
    queryKey: shiftKeys.assignments(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.shiftId) qs.append('shiftId', params.shiftId);
      if (params?.employeeId) qs.append('employeeId', params.employeeId);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return get<ShiftAssignment[]>(`/hr/shifts/assignments${suffix}`);
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShiftPayload) => post<Shift>('/hr/shifts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftPayload }) =>
      put<Shift>(`/hr/shifts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<Shift>(`/hr/shifts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
    },
  });
}

export function useAssignShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignShiftPayload) =>
      post<ShiftAssignment>('/hr/shifts/assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
    },
  });
}

export function useDeactivateShiftAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, effectiveTo }: { id: string; effectiveTo: string }) =>
      put<ShiftAssignment>(`/hr/shifts/assignments/${id}/deactivate`, { effectiveTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
    },
  });
}
