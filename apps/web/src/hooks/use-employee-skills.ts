'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, buildQueryString } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────

export type EmployeeSkillProficiency =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export const EMPLOYEE_SKILL_PROFICIENCY_LABELS: Record<
  EmployeeSkillProficiency,
  string
> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export const EMPLOYEE_SKILL_PROFICIENCIES: EmployeeSkillProficiency[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
];

export interface EmployeeSkill {
  id: string;
  tenantId: string;
  employeeId: string;
  skill: string;
  category: string | null;
  proficiency: EmployeeSkillProficiency;
  yearsOfExperience: string | null;
  certificationName: string | null;
  certificationIssuer: string | null;
  certificationDate: string | null;
  certificationExpiresAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeSkillInput {
  employeeId: string;
  skill: string;
  category?: string;
  proficiency: EmployeeSkillProficiency;
  yearsOfExperience?: string;
  certificationName?: string;
  certificationIssuer?: string;
  certificationDate?: string;
  certificationExpiresAt?: string;
  notes?: string;
}

export type UpdateEmployeeSkillInput = Partial<
  Omit<CreateEmployeeSkillInput, 'employeeId'>
>;

export interface EmployeeSkillListParams {
  employeeId?: string;
}

// ─── HR-side hooks ──────────────────────────────────────

const HR_LIST_KEY = ['hr', 'employee-skills'] as const;

export function useEmployeeSkills(params: EmployeeSkillListParams = {}) {
  return useQuery({
    queryKey: [...HR_LIST_KEY, params],
    queryFn: () =>
      get<EmployeeSkill[]>(
        `/hr/employee-skills${buildQueryString({
          employeeId: params.employeeId ?? null,
        })}`,
      ),
  });
}

export function useCreateEmployeeSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeSkillInput) =>
      post<EmployeeSkill>('/hr/employee-skills', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

export function useUpdateEmployeeSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmployeeSkillInput;
    }) => put<EmployeeSkill>(`/hr/employee-skills/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

export function useDeleteEmployeeSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: boolean }>(`/hr/employee-skills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: HR_LIST_KEY }),
  });
}

// ─── ESS-side hooks ─────────────────────────────────────

const ESS_LIST_KEY = ['ess', 'skills'] as const;

export function useMySkills() {
  return useQuery({
    queryKey: ESS_LIST_KEY,
    queryFn: () => get<EmployeeSkill[]>('/ess/skills'),
  });
}

export function useCreateMySkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CreateEmployeeSkillInput, 'employeeId'>) =>
      post<EmployeeSkill>('/ess/skills', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}

export function useUpdateMySkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmployeeSkillInput;
    }) => put<EmployeeSkill>(`/ess/skills/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}

export function useDeleteMySkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: boolean }>(`/ess/skills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}
