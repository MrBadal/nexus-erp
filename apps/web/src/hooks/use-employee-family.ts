'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, buildQueryString } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────

export type EmployeeFamilyRelationship =
  | 'spouse'
  | 'father'
  | 'mother'
  | 'son'
  | 'daughter'
  | 'sibling'
  | 'other';

export const EMPLOYEE_FAMILY_RELATIONSHIP_LABELS: Record<
  EmployeeFamilyRelationship,
  string
> = {
  spouse: 'Spouse',
  father: 'Father',
  mother: 'Mother',
  son: 'Son',
  daughter: 'Daughter',
  sibling: 'Sibling',
  other: 'Other',
};

export const EMPLOYEE_FAMILY_RELATIONSHIPS: EmployeeFamilyRelationship[] = [
  'spouse',
  'father',
  'mother',
  'son',
  'daughter',
  'sibling',
  'other',
];

export interface EmployeeFamily {
  id: string;
  tenantId: string;
  employeeId: string;
  name: string;
  relationship: EmployeeFamilyRelationship;
  dateOfBirth: string | null;
  nominee: boolean;
  nomineeSharePercent: number | null;
  aadhaarNumber: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeFamilyInput {
  employeeId: string;
  name: string;
  relationship: EmployeeFamilyRelationship;
  dateOfBirth?: string;
  nominee?: boolean;
  nomineeSharePercent?: number;
  aadhaarNumber?: string;
  contactPhone?: string;
  notes?: string;
}

export type UpdateEmployeeFamilyInput = Partial<
  Omit<CreateEmployeeFamilyInput, 'employeeId'>
>;

export interface EmployeeFamilyListParams {
  employeeId?: string;
}

// ─── HR-side hooks ──────────────────────────────────────

const HR_LIST_KEY = ['hr', 'employee-family'] as const;

export function useEmployeeFamily(params: EmployeeFamilyListParams = {}) {
  return useQuery({
    queryKey: [...HR_LIST_KEY, params],
    queryFn: () =>
      get<EmployeeFamily[]>(
        `/hr/employee-family${buildQueryString({
          employeeId: params.employeeId ?? null,
        })}`,
      ),
  });
}

export function useCreateEmployeeFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeFamilyInput) =>
      post<EmployeeFamily>('/hr/employee-family', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

export function useUpdateEmployeeFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmployeeFamilyInput;
    }) => put<EmployeeFamily>(`/hr/employee-family/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

export function useDeleteEmployeeFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: boolean }>(`/hr/employee-family/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

// ─── ESS-side hooks ─────────────────────────────────────

const ESS_LIST_KEY = ['ess', 'family'] as const;

export function useMyFamily() {
  return useQuery({
    queryKey: ESS_LIST_KEY,
    queryFn: () => get<EmployeeFamily[]>('/ess/family'),
  });
}

export function useCreateMyFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CreateEmployeeFamilyInput, 'employeeId'>) =>
      post<EmployeeFamily>('/ess/family', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}

export function useUpdateMyFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmployeeFamilyInput;
    }) => put<EmployeeFamily>(`/ess/family/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}

export function useDeleteMyFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: boolean }>(`/ess/family/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}
