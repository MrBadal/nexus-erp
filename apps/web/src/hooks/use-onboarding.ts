'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────

export type OnboardingTaskStatus = 'pending' | 'done' | 'skipped';
export type OnboardingChecklistStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue';
export type OnboardingDefaultAssignee = 'hr' | 'manager' | 'employee' | 'it' | 'admin';

export interface OnboardingTemplateTask {
  id: string;
  templateId: string;
  sequence: number;
  title: string;
  description: string | null;
  defaultAssignee: OnboardingDefaultAssignee;
  dueDays: number;
  isMandatory: boolean;
}

export interface OnboardingTemplate {
  id: string;
  tenantId: string;
  name: string;
  designationId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tasks?: OnboardingTemplateTask[];
}

export interface OnboardingTask {
  id: string;
  checklistId: string;
  sequence: number;
  title: string;
  description: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  status: OnboardingTaskStatus;
  completedBy: string | null;
  completedAt: string | null;
  notes: string | null;
}

export interface OnboardingChecklist {
  id: string;
  tenantId: string;
  employeeId: string;
  templateId: string | null;
  status: OnboardingChecklistStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employeeFirstName?: string;
  employeeLastName?: string;
  employeeCode?: string;
  tasks?: OnboardingTask[];
}

export type OnboardingKanban = Record<OnboardingChecklistStatus, OnboardingChecklist[]>;

// ─── Templates ─────────────────────────────────────────────

const templateKeys = {
  all: ['onboarding-templates'] as const,
  list: () => [...templateKeys.all, 'list'] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
};

export function useOnboardingTemplates(params?: { isActive?: boolean }) {
  return useQuery({
    queryKey: [...templateKeys.list(), params],
    queryFn: () => {
      const qs =
        params?.isActive !== undefined ? `?isActive=${params.isActive}` : '';
      return get<OnboardingTemplate[]>(`${endpoints.onboardingTemplates.list}${qs}`);
    },
    staleTime: 30_000,
  });
}

export function useOnboardingTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => get<OnboardingTemplate>(endpoints.onboardingTemplates.get(id)),
    enabled: !!id,
  });
}

export function useCreateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post<OnboardingTemplate>(endpoints.onboardingTemplates.create, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useUpdateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      put<OnboardingTemplate>(endpoints.onboardingTemplates.update(id), data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: templateKeys.detail(id) });
      qc.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });
}

export function useDeleteOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(endpoints.onboardingTemplates.delete(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

// ─── Checklists ────────────────────────────────────────────

const checklistKeys = {
  all: ['onboarding-checklists'] as const,
  list: (params?: Record<string, unknown>) => [...checklistKeys.all, 'list', params] as const,
  detail: (id: string) => [...checklistKeys.all, 'detail', id] as const,
  kanban: () => [...checklistKeys.all, 'kanban'] as const,
  myTasks: () => [...checklistKeys.all, 'my-tasks'] as const,
};

export function useOnboardingChecklists(params?: {
  status?: OnboardingChecklistStatus;
  employeeId?: string;
}) {
  return useQuery({
    queryKey: checklistKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.status) sp.append('status', params.status);
      if (params?.employeeId) sp.append('employeeId', params.employeeId);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return get<OnboardingChecklist[]>(`${endpoints.onboardingChecklists.list}${qs}`);
    },
    staleTime: 30_000,
  });
}

export function useOnboardingChecklist(id: string) {
  return useQuery({
    queryKey: checklistKeys.detail(id),
    queryFn: () => get<OnboardingChecklist>(endpoints.onboardingChecklists.get(id)),
    enabled: !!id,
  });
}

export function useOnboardingKanban() {
  return useQuery({
    queryKey: checklistKeys.kanban(),
    queryFn: () => get<OnboardingKanban>(endpoints.onboardingChecklists.kanban),
    staleTime: 15_000,
  });
}

export function useMyOnboardingTasks() {
  return useQuery({
    queryKey: checklistKeys.myTasks(),
    queryFn: () => get<OnboardingTask[]>(endpoints.onboardingChecklists.myTasks),
    staleTime: 15_000,
  });
}

export function useCreateOnboardingChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: string; templateId: string }) =>
      post<OnboardingChecklist>(endpoints.onboardingChecklists.create, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKeys.all });
    },
  });
}

export function useUpdateOnboardingTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: OnboardingTaskStatus;
      notes?: string;
    }) => put<OnboardingTask>(endpoints.onboardingChecklists.updateTaskStatus(id), { status, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKeys.all });
    },
  });
}
