'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────

export type OffboardingTaskStatus = 'pending' | 'done' | 'skipped';
export type OffboardingChecklistStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue';
export type OffboardingDefaultAssignee = 'hr' | 'manager' | 'employee' | 'it' | 'admin';

export interface OffboardingTemplateTask {
  id: string;
  templateId: string;
  sequence: number;
  title: string;
  description: string | null;
  defaultAssignee: OffboardingDefaultAssignee;
  dueDays: number;
  isMandatory: boolean;
}

export interface OffboardingTemplate {
  id: string;
  tenantId: string;
  name: string;
  designationId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tasks?: OffboardingTemplateTask[];
}

export interface OffboardingTask {
  id: string;
  checklistId: string;
  sequence: number;
  title: string;
  description: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  status: OffboardingTaskStatus;
  completedBy: string | null;
  completedAt: string | null;
  notes: string | null;
}

export interface OffboardingChecklist {
  id: string;
  tenantId: string;
  employeeId: string;
  templateId: string | null;
  status: OffboardingChecklistStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employeeFirstName?: string;
  employeeLastName?: string;
  employeeCode?: string;
  tasks?: OffboardingTask[];
}

export type OffboardingKanban = Record<OffboardingChecklistStatus, OffboardingChecklist[]>;

// ─── Templates ─────────────────────────────────────────────

const templateKeys = {
  all: ['offboarding-templates'] as const,
  list: () => [...templateKeys.all, 'list'] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
};

export function useOffboardingTemplates(params?: { isActive?: boolean }) {
  return useQuery({
    queryKey: [...templateKeys.list(), params],
    queryFn: () => {
      const qs =
        params?.isActive !== undefined ? `?isActive=${params.isActive}` : '';
      return get<OffboardingTemplate[]>(`${endpoints.offboardingTemplates.list}${qs}`);
    },
    staleTime: 30_000,
  });
}

export function useOffboardingTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => get<OffboardingTemplate>(endpoints.offboardingTemplates.get(id)),
    enabled: !!id,
  });
}

export function useCreateOffboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post<OffboardingTemplate>(endpoints.offboardingTemplates.create, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useUpdateOffboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      put<OffboardingTemplate>(endpoints.offboardingTemplates.update(id), data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: templateKeys.detail(id) });
      qc.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });
}

export function useDeleteOffboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(endpoints.offboardingTemplates.delete(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

// ─── Checklists ────────────────────────────────────────────

const checklistKeys = {
  all: ['offboarding-checklists'] as const,
  list: (params?: Record<string, unknown>) => [...checklistKeys.all, 'list', params] as const,
  detail: (id: string) => [...checklistKeys.all, 'detail', id] as const,
  kanban: () => [...checklistKeys.all, 'kanban'] as const,
  myTasks: () => [...checklistKeys.all, 'my-tasks'] as const,
};

export function useOffboardingChecklists(params?: {
  status?: OffboardingChecklistStatus;
  employeeId?: string;
}) {
  return useQuery({
    queryKey: checklistKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.status) sp.append('status', params.status);
      if (params?.employeeId) sp.append('employeeId', params.employeeId);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return get<OffboardingChecklist[]>(`${endpoints.offboardingChecklists.list}${qs}`);
    },
    staleTime: 30_000,
  });
}

export function useOffboardingChecklist(id: string) {
  return useQuery({
    queryKey: checklistKeys.detail(id),
    queryFn: () => get<OffboardingChecklist>(endpoints.offboardingChecklists.get(id)),
    enabled: !!id,
  });
}

export function useOffboardingKanban() {
  return useQuery({
    queryKey: checklistKeys.kanban(),
    queryFn: () => get<OffboardingKanban>(endpoints.offboardingChecklists.kanban),
    staleTime: 15_000,
  });
}

export function useMyOffboardingTasks() {
  return useQuery({
    queryKey: checklistKeys.myTasks(),
    queryFn: () => get<OffboardingTask[]>(endpoints.offboardingChecklists.myTasks),
    staleTime: 15_000,
  });
}

export function useCreateOffboardingChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: string; templateId: string }) =>
      post<OffboardingChecklist>(endpoints.offboardingChecklists.create, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKeys.all });
    },
  });
}

export function useUpdateOffboardingTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: OffboardingTaskStatus;
      notes?: string;
    }) => put<OffboardingTask>(endpoints.offboardingChecklists.updateTaskStatus(id), { status, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKeys.all });
    },
  });
}
