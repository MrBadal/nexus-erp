'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, buildQueryString } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────

export interface EmployeeExperience {
  id: string;
  tenantId: string;
  employeeId: string;
  companyName: string;
  title: string;
  fromDate: string;
  toDate: string | null;
  employmentType: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeExperienceInput {
  employeeId: string;
  companyName: string;
  title: string;
  fromDate: string;
  toDate?: string;
  employmentType?: string;
  description?: string;
}

export type UpdateEmployeeExperienceInput = Partial<
  Omit<CreateEmployeeExperienceInput, 'employeeId'>
>;

export interface EmployeeExperienceListParams {
  employeeId?: string;
}

// ─── HR-side hooks ──────────────────────────────────────

const HR_LIST_KEY = ['hr', 'employee-experience'] as const;

export function useEmployeeExperience(
  params: EmployeeExperienceListParams = {},
) {
  return useQuery({
    queryKey: [...HR_LIST_KEY, params],
    queryFn: () =>
      get<EmployeeExperience[]>(
        `/hr/employee-experience${buildQueryString({
          employeeId: params.employeeId ?? null,
        })}`,
      ),
  });
}

export function useCreateEmployeeExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeExperienceInput) =>
      post<EmployeeExperience>('/hr/employee-experience', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

export function useUpdateEmployeeExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmployeeExperienceInput;
    }) => put<EmployeeExperience>(`/hr/employee-experience/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

export function useDeleteEmployeeExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: boolean }>(`/hr/employee-experience/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

// ─── ESS-side hooks ─────────────────────────────────────

const ESS_LIST_KEY = ['ess', 'experience'] as const;

export function useMyExperience() {
  return useQuery({
    queryKey: ESS_LIST_KEY,
    queryFn: () => get<EmployeeExperience[]>('/ess/experience'),
  });
}

export function useCreateMyExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CreateEmployeeExperienceInput, 'employeeId'>) =>
      post<EmployeeExperience>('/ess/experience', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}

export function useUpdateMyExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmployeeExperienceInput;
    }) => put<EmployeeExperience>(`/ess/experience/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}

export function useDeleteMyExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: boolean }>(`/ess/experience/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}
