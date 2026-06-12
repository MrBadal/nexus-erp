"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  body: string | null;
  read: boolean;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

interface UnreadCountResponse {
  count: number;
}

const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: Record<string, unknown>) => ["notifications", "list", params] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

export function useNotifications(options?: { limit?: number; offset?: number; unreadOnly?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.list(options as Record<string, unknown>),
    queryFn: () =>
      get<NotificationsResponse>("/notifications", {
        limit: options?.limit || 20,
        offset: options?.offset || 0,
        unreadOnly: options?.unreadOnly ? "true" : undefined,
      }),
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => get<UnreadCountResponse>("/notifications/unread-count"),
    refetchInterval: 15000, // Poll every 15 seconds
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      post<Notification>(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ success: boolean }>("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
