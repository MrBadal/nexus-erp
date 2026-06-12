'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, buildQueryString } from '@/lib/api';

export interface CrudEndpoints {
  list: string;
  get: (id: string) => string;
  create: string;
  update: (id: string) => string;
  delete: (id: string) => string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined | null;
}

export function createCrudHooks<T extends { id: string }>(
  entityName: string,
  endpointConfig: CrudEndpoints,
) {
  const queryKeys = {
    all: [entityName] as const,
    lists: () => [...queryKeys.all, 'list'] as const,
    list: (params?: ListParams) => [...queryKeys.lists(), params] as const,
    details: () => [...queryKeys.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.details(), id] as const,
  };

  function useList(params?: ListParams) {
    return useQuery({
      queryKey: queryKeys.list(params),
      queryFn: async () => {
        const qs = params ? buildQueryString(params as Record<string, string | number | boolean | undefined | null>) : '';
        return get<T[]>(`${endpointConfig.list}${qs}`);
      },
      staleTime: 30_000, // List data is fresh for 30 seconds
    });
  }

  function useById(id: string) {
    return useQuery({
      queryKey: queryKeys.detail(id),
      queryFn: async () => {
        return get<T>(endpointConfig.get(id));
      },
      enabled: !!id,
      staleTime: 60_000, // Detail data is fresh for 1 minute
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (data: Partial<T> | Record<string, unknown>) => {
        return post<T>(endpointConfig.create, data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.all });
      },
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, data }: { id: string; data: Partial<T> | Record<string, unknown> }) => {
        return put<T>(endpointConfig.update(id), data);
      },
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      },
    });
  }

  function useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        await del(endpointConfig.delete(id));
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.all });
      },
    });
  }

  return {
    queryKeys,
    useList,
    useById,
    useCreate,
    useUpdate,
    useDelete,
  };
}

/**
 * Create a status action hook for workflow transitions.
 * E.g., confirm, approve, cancel, submit, etc.
 */
export function createStatusActionHook<T>(
  entityName: string,
  actionName: string,
  endpointFn: (id: string) => string,
) {
  return function useStatusAction() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        return post<T>(endpointFn(id));
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [entityName] });
      },
    });
  };
}
