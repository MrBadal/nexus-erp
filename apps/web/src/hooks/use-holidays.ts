'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, buildQueryString } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HolidayType = 'national' | 'state' | 'company' | 'restricted';

export interface Holiday {
  id: string;
  tenantId: string;
  date: string;
  name: string;
  type: HolidayType;
  regions: string[] | null;
  isRecurring: boolean;
  year: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateHolidayInput {
  date: string;
  name: string;
  type?: HolidayType;
  regions?: string[];
  isRecurring?: boolean;
  year?: number;
  notes?: string;
}

export type UpdateHolidayInput = Partial<CreateHolidayInput>;

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const holidayKeys = {
  all: ['holidays'] as const,
  lists: () => [...holidayKeys.all, 'list'] as const,
  list: (params?: { year?: number; ess?: boolean }) =>
    [...holidayKeys.lists(), params ?? {}] as const,
  detail: (id: string) => [...holidayKeys.all, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Hooks – HR side
// ---------------------------------------------------------------------------

export function useHolidays(params?: { year?: number }) {
  return useQuery({
    queryKey: holidayKeys.list({ year: params?.year, ess: false }),
    queryFn: async () => {
      const qs = params?.year
        ? buildQueryString({ year: params.year })
        : '';
      return get<Holiday[]>(`/hr/holidays${qs}`);
    },
  });
}

export function useHoliday(id: string | undefined) {
  return useQuery({
    queryKey: holidayKeys.detail(id ?? ''),
    queryFn: async () => get<Holiday>(`/hr/holidays/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateHolidayInput) => post<Holiday>('/hr/holidays', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateHolidayInput }) =>
      put<Holiday>(`/hr/holidays/${id}`, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
      queryClient.invalidateQueries({ queryKey: holidayKeys.detail(vars.id) });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => del<{ success: true }>(`/hr/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Hooks – ESS side
// ---------------------------------------------------------------------------

export function useEssHolidays(params?: { year?: number }) {
  return useQuery({
    queryKey: holidayKeys.list({ year: params?.year, ess: true }),
    queryFn: async () => {
      const qs = params?.year
        ? buildQueryString({ year: params.year })
        : '';
      return get<Holiday[]>(`/ess/holidays${qs}`);
    },
  });
}
