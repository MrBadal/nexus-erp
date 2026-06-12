'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints } from '@/lib/api';

export interface ApprovalWorkflow {
  id: string;
  tenantId: string;
  name: string;
  documentType: string;
  isActive: boolean;
  description: string;
  thresholdAmount: string;
  steps?: ApprovalWorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalWorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  approverRoleId: string;
  approverUserId: string;
  description: string;
}

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  workflowId: string;
  documentType: string;
  documentId: string;
  documentNumber: string;
  currentStep: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedBy: string;
  amount: string;
  notes: string;
  createdAt: string;
}

export function useApprovalWorkflows() {
  return useQuery({
    queryKey: ['approvalWorkflows'],
    queryFn: () => get<ApprovalWorkflow[]>(endpoints.approvalWorkflows.list),
  });
}

export function useApprovalWorkflow(id: string) {
  return useQuery({
    queryKey: ['approvalWorkflows', id],
    queryFn: () => get<ApprovalWorkflow>(endpoints.approvalWorkflows.get(id)),
    enabled: !!id,
  });
}

export function useCreateApprovalWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post<ApprovalWorkflow>(endpoints.approvalWorkflows.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalWorkflows'] });
    },
  });
}

export function useUpdateApprovalWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      put<ApprovalWorkflow>(endpoints.approvalWorkflows.update(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalWorkflows'] });
    },
  });
}

export function useDeleteApprovalWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(endpoints.approvalWorkflows.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalWorkflows'] });
    },
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvalRequests', 'pending'],
    queryFn: () => get<ApprovalRequest[]>(endpoints.approvalWorkflows.pending),
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      post(endpoints.approvalWorkflows.approve(id), { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      post(endpoints.approvalWorkflows.reject(id), { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
    },
  });
}
