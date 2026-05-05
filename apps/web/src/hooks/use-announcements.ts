'use client';

import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del, buildQueryString } from '@/lib/api';

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

const HR_BASE = '/hr/announcements';
const ESS_BASE = '/ess/announcements';

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
      return get<Announcement[]>(`${HR_BASE}${qs}`);
    },
  });
}

export function useAnnouncement(id: string) {
  return useQuery({
    queryKey: announcementKeys.detail(id),
    queryFn: async () => get<Announcement>(`${HR_BASE}/${id}`),
    enabled: !!id,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AnnouncementCreateInput) =>
      post<Announcement>(HR_BASE, data),
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
      const response = await axios.patch(`${baseURL}${HR_BASE}/${id}`, data, {
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
      post<Announcement>(`${HR_BASE}/${id}/publish`),
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
      await del(`${HR_BASE}/${id}`);
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
    queryFn: async () => get<Announcement[]>(ESS_BASE),
  });
}

export function useAnnouncementUnreadCount() {
  return useQuery({
    queryKey: announcementKeys.unread(),
    queryFn: async () => get<{ count: number }>(`${ESS_BASE}/unread-count`),
  });
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      post<{ success: boolean }>(`${ESS_BASE}/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.feed() });
      queryClient.invalidateQueries({ queryKey: announcementKeys.unread() });
    },
  });
}
