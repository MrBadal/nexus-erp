'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, buildQueryString, endpoints as registry } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────

export interface ReviewCycle {
  id: string;
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'open' | 'review' | 'closed';
  createdAt: string;
}

export interface KraItem {
  title: string;
  weight: number;
  target: string;
}

export interface KraTemplate {
  id: string;
  tenantId: string;
  name: string;
  designationId: string | null;
  designationName?: string | null;
  kras: KraItem[];
  createdAt: string;
}

export interface PerformanceGoal {
  id: string;
  tenantId: string;
  employeeId: string;
  cycleId: string;
  title: string;
  weight: string;
  target: string | null;
  achievement: string | null;
  status: 'draft' | 'active' | 'completed';
  selfRating: number | null;
  managerRating: number | null;
  managerComment: string | null;
  createdAt: string;
}

export interface ReviewResponse {
  id: string;
  tenantId: string;
  cycleId: string;
  employeeId: string;
  reviewerId: string | null;
  role: 'self' | 'manager' | 'peer';
  responses: Record<string, unknown>;
  overallRating: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface CycleReport {
  cycle: ReviewCycle;
  summary: {
    totalEmployees: number;
    totalGoals: number;
    totalReviews: number;
  };
  perEmployee: Array<{
    employeeId: string;
    employeeName: string;
    employeeCode: string | null;
    goals: {
      total: number;
      completed: number;
      avgSelfRating: number | null;
      avgManagerRating: number | null;
      weightedSelfScore: number | null;
      weightedManagerScore: number | null;
    };
    reviews: Record<string, { count: number; avgRating: number | null } | null>;
  }>;
}

// ─── Endpoints (from the central registry) ──────────────
const endpoints = registry.performance;

// ─── Cycles ──────────────────────────────────────────────

export function useReviewCycles(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['performance-cycles', params],
    queryFn: () => get<ReviewCycle[]>(`${endpoints.cycles.list}${buildQueryString(params ?? {})}`),
    staleTime: 30_000,
  });
}

export function useReviewCycle(id: string | undefined) {
  return useQuery({
    queryKey: ['performance-cycles', 'detail', id],
    queryFn: () => get<ReviewCycle>(endpoints.cycles.get(id!)),
    enabled: !!id,
  });
}

export function useCreateReviewCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; startDate: string; endDate: string }) =>
      post<ReviewCycle>(endpoints.cycles.create, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance-cycles'] }),
  });
}

export function useUpdateReviewCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<ReviewCycle>) =>
      put<ReviewCycle>(endpoints.cycles.update(id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance-cycles'] }),
  });
}

export function useDeleteReviewCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(endpoints.cycles.delete(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance-cycles'] }),
  });
}

export function useCycleReport(id: string | undefined) {
  return useQuery({
    queryKey: ['performance-cycles', 'report', id],
    queryFn: () => get<CycleReport>(endpoints.cycles.report(id!)),
    enabled: !!id,
  });
}

export function useCycleReviews(id: string | undefined, employeeId?: string) {
  return useQuery({
    queryKey: ['performance-cycles', 'reviews', id, employeeId],
    queryFn: () =>
      get<ReviewResponse[]>(`${endpoints.cycles.reviews(id!)}${buildQueryString({ employeeId })}`),
    enabled: !!id,
  });
}

// ─── KRA Templates ───────────────────────────────────────

export function useKraTemplates(params?: { designationId?: string }) {
  return useQuery({
    queryKey: ['kra-templates', params],
    queryFn: () => get<KraTemplate[]>(`${endpoints.templates.list}${buildQueryString(params ?? {})}`),
    staleTime: 60_000,
  });
}

export function useKraTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['kra-templates', 'detail', id],
    queryFn: () => get<KraTemplate>(endpoints.templates.get(id!)),
    enabled: !!id,
  });
}

export function useCreateKraTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; designationId?: string; kras: KraItem[] }) =>
      post<KraTemplate>(endpoints.templates.create, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kra-templates'] }),
  });
}

export function useUpdateKraTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; designationId?: string; kras?: KraItem[] }) =>
      put<KraTemplate>(endpoints.templates.update(id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kra-templates'] }),
  });
}

export function useDeleteKraTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(endpoints.templates.delete(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kra-templates'] }),
  });
}

// ─── HR Goals (manager view) ─────────────────────────────

export function useGoalsHr(params?: { employeeId?: string; cycleId?: string; status?: string }) {
  return useQuery({
    queryKey: ['performance-goals', 'hr', params],
    queryFn: () => get<PerformanceGoal[]>(`${endpoints.hrGoals.list}${buildQueryString(params ?? {})}`),
  });
}

export function useManagerCommentGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; managerRating?: number; managerComment?: string }) =>
      post<PerformanceGoal>(endpoints.hrGoals.managerComment(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['performance-goals'] });
      qc.invalidateQueries({ queryKey: ['ess-performance-goals'] });
    },
  });
}

export function useSubmitManagerReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      cycleId: string;
      employeeId: string;
      role: 'manager' | 'peer';
      responses: Record<string, unknown>;
      overallRating?: number;
    }) => post<ReviewResponse>(endpoints.hrReviews.submit, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance-cycles'] }),
  });
}

// ─── ESS hooks ───────────────────────────────────────────

export function useActiveCycleEss() {
  return useQuery({
    queryKey: ['ess-performance-cycle-active'],
    queryFn: () => get<ReviewCycle | null>(endpoints.ess.activeCycle),
    staleTime: 60_000,
  });
}

export function useMyGoals(params?: { cycleId?: string; status?: string }) {
  return useQuery({
    queryKey: ['ess-performance-goals', params],
    queryFn: () => get<PerformanceGoal[]>(`${endpoints.ess.goals}${buildQueryString(params ?? {})}`),
  });
}

export function useCreateMyGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { cycleId: string; title: string; weight?: number; target?: string }) =>
      post<PerformanceGoal>(endpoints.ess.goals, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ess-performance-goals'] }),
  });
}

export function useUpdateMyGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<PerformanceGoal>) =>
      put<PerformanceGoal>(endpoints.ess.goalDetail(id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ess-performance-goals'] }),
  });
}

export function useDeleteMyGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(endpoints.ess.goalDetail(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ess-performance-goals'] }),
  });
}

export function useMyReviews() {
  return useQuery({
    queryKey: ['ess-performance-reviews'],
    queryFn: () => get<ReviewResponse[]>(endpoints.ess.myReviews),
  });
}

export function useSubmitSelfReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      cycleId: string;
      responses: Record<string, unknown>;
      overallRating?: number;
    }) =>
      post<ReviewResponse>(endpoints.ess.submitSelfReview, {
        ...data,
        role: 'self',
        employeeId: '00000000-0000-0000-0000-000000000000',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ess-performance-reviews'] }),
  });
}
