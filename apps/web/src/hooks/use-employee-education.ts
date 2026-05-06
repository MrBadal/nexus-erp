'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, buildQueryString } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────

export interface EmployeeEducation {
  id: string;
  tenantId: string;
  employeeId: string;
  degree: string;
  institution: string;
  fieldOfStudy: string | null;
  startYear: number;
  endYear: number | null;
  grade: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeEducationInput {
  employeeId: string;
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  startYear: number;
  endYear?: number;
  grade?: string;
  notes?: string;
}

export type UpdateEmployeeEducationInput = Partial<
  Omit<CreateEmployeeEducationInput, 'employeeId'>
>;

export interface EmployeeEducationListParams {
  employeeId?: string;
}

// ─── HR-side hooks ──────────────────────────────────────

const HR_LIST_KEY = ['hr', 'employee-education'] as const;

export function useEmployeeEducation(params: EmployeeEducationListParams = {}) {
  return useQuery({
    queryKey: [...HR_LIST_KEY, params],
    queryFn: () =>
      get<EmployeeEducation[]>(
        `/hr/employee-education${buildQueryString({
          employeeId: params.employeeId ?? null,
        })}`,
      ),
  });
}

export function useCreateEmployeeEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeEducationInput) =>
      post<EmployeeEducation>('/hr/employee-education', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

export function useUpdateEmployeeEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmployeeEducationInput;
    }) => put<EmployeeEducation>(`/hr/employee-education/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

export function useDeleteEmployeeEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: boolean }>(`/hr/employee-education/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

// ─── ESS-side hooks ─────────────────────────────────────

const ESS_LIST_KEY = ['ess', 'education'] as const;

export function useMyEducation() {
  return useQuery({
    queryKey: ESS_LIST_KEY,
    queryFn: () => get<EmployeeEducation[]>('/ess/education'),
  });
}

export function useCreateMyEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CreateEmployeeEducationInput, 'employeeId'>) =>
      post<EmployeeEducation>('/ess/education', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}

export function useUpdateMyEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmployeeEducationInput;
    }) => put<EmployeeEducation>(`/ess/education/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}

export function useDeleteMyEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: boolean }>(`/ess/education/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}
