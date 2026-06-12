'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, endpoints, buildQueryString } from '@/lib/api';

export interface RetentionPolicy {
  id: string;
  tenantId: string;
  documentType: string;
  retentionDays: number;
  autoArchive: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegalHold {
  id: string;
  tenantId: string;
  documentType: string;
  documentId: string;
  reason: string;
  heldBy: string;
  heldAt: string;
  releasedAt: string | null;
  releasedBy: string | null;
}

export interface CreateRetentionPolicyData {
  documentType: string;
  retentionDays: number;
  autoArchive?: boolean;
}

export interface UpdateRetentionPolicyData {
  retentionDays?: number;
  autoArchive?: boolean;
  isActive?: boolean;
}

export interface CreateLegalHoldData {
  documentType: string;
  documentId: string;
  reason: string;
}

export const retentionKeys = {
  all: ['retention-policies'] as const,
  lists: () => [...retentionKeys.all, 'list'] as const,
};

export const legalHoldKeys = {
  all: ['legal-holds'] as const,
  lists: () => [...legalHoldKeys.all, 'list'] as const,
  list: (params?: { documentType?: string; documentId?: string }) =>
    [...legalHoldKeys.lists(), params] as const,
};

export function useRetentionPolicies() {
  return useQuery({
    queryKey: retentionKeys.lists(),
    queryFn: async () => {
      return get<RetentionPolicy[]>(endpoints.retentionPolicies.list);
    },
  });
}

export function useCreateRetentionPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRetentionPolicyData) => {
      return post<RetentionPolicy>(endpoints.retentionPolicies.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.lists() });
    },
  });
}

export function useUpdateRetentionPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRetentionPolicyData }) => {
      return put<RetentionPolicy>(endpoints.retentionPolicies.update(id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: retentionKeys.lists() });
    },
  });
}

export function useLegalHolds(params?: { documentType?: string; documentId?: string }) {
  return useQuery({
    queryKey: legalHoldKeys.list(params),
    queryFn: async () => {
      const qs = params ? buildQueryString(params) : '';
      return get<LegalHold[]>(`${endpoints.legalHolds.list}${qs}`);
    },
  });
}

export function usePlaceLegalHold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLegalHoldData) => {
      return post<LegalHold>(endpoints.legalHolds.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalHoldKeys.all });
    },
  });
}

export function useReleaseLegalHold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<LegalHold>(endpoints.legalHolds.release(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalHoldKeys.all });
    },
  });
}
