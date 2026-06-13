'use client';

import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del, buildQueryString, endpoints } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnnouncementAudienceScope =
  | 'tenant'
  | 'department'
  | 'designation'
  | 'specific';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'expired';

export interface Announcement {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  audienceScope: AnnouncementAudienceScope;
  audienceIds: string[] | null;
  publishedAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // HR-side enrichment
  readCount?: number;
  status?: AnnouncementStatus;
  // ESS-side enrichment
  read?: boolean;
}

export interface AnnouncementCreateInput {
  title: string;
  body: string;
  audienceScope: AnnouncementAudienceScope;
  audienceIds?: string[];
  /** ISO 8601 — omit (not null) for draft */
  publishedAt?: string;
  /** ISO 8601 — omit (not null) when no expiry */
  expiresAt?: string;
}

export interface AnnouncementUpdateInput extends Partial<AnnouncementCreateInput> {}

interface ListParams {
  search?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Endpoint paths (kept local because endpoints.ts is not in this sandbox)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const announcementKeys = {
  all: ['announcements'] as const,
  lists: () => [...announcementKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...announcementKeys.lists(), params] as const,
  details: () => [...announcementKeys.all, 'detail'] as const,
  detail: (id: string) => [...announcementKeys.details(), id] as const,
  feed: () => [...announcementKeys.all, 'feed'] as const,
  unread: () => [...announcementKeys.all, 'unread-count'] as const,
};

// ---------------------------------------------------------------------------
// HR-side hooks
// ---------------------------------------------------------------------------

export function useAnnouncements(params?: ListParams) {
  return useQuery({
    queryKey: announcementKeys.list(params),
    queryFn: async () => {
      const qs = params
        ? buildQueryString(
            params as Record<string, string | number | boolean | undefined | null>,
          )
        : '';
      return get<Announcement[]>(`${endpoints.announcements.list}${qs}`);
    },
  });
}

export function useAnnouncement(id: string) {
  return useQuery({
    queryKey: announcementKeys.detail(id),
    queryFn: async () => get<Announcement>(endpoints.announcements.get(id)),
    enabled: !!id,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AnnouncementCreateInput) =>
      post<Announcement>(endpoints.announcements.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AnnouncementUpdateInput }) => {
      // Use raw axios so we can issue a PATCH against the API
      const baseURL =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('nexus_access_token');
        if (token) headers.Authorization = `Bearer ${token}`;
        const tenantStr = localStorage.getItem('nexus_tenant');
        if (tenantStr) {
          try {
            const tenant = JSON.parse(tenantStr);
            if (tenant?.id) headers['X-Tenant-ID'] = tenant.id;
          } catch {
            // ignore parse errors
          }
        }
      }
      const response = await axios.patch(`${baseURL}${endpoints.announcements.update(id)}`, data, {
        headers,
      });
      const body = response.data;
      return (body && typeof body === 'object' && 'data' in body
        ? (body as { data: Announcement }).data
        : (body as Announcement));
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
    },
  });
}

export function usePublishAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      post<Announcement>(endpoints.announcements.publish(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await del(endpoints.announcements.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// ESS-side hooks
// ---------------------------------------------------------------------------

export function useAnnouncementFeed() {
  return useQuery({
    queryKey: announcementKeys.feed(),
    queryFn: async () => get<Announcement[]>(endpoints.announcements.essList),
  });
}

export function useAnnouncementUnreadCount() {
  return useQuery({
    queryKey: announcementKeys.unread(),
    queryFn: async () => get<{ count: number }>(endpoints.announcements.essUnreadCount),
  });
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      post<{ success: boolean }>(endpoints.announcements.essRead(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.feed() });
      queryClient.invalidateQueries({ queryKey: announcementKeys.unread() });
    },
  });
}
