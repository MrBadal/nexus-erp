'use client';

import { useQuery } from '@tanstack/react-query';
import { get, endpoints, buildQueryString } from '@/lib/api';

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  tenantId: string;
  userId: string | null;
  eventType: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (params?: { entityType?: string; entityId?: string }) =>
    [...auditKeys.lists(), params] as const,
};

export const securityEventKeys = {
  all: ['security-events'] as const,
  lists: () => [...securityEventKeys.all, 'list'] as const,
  list: (params?: { eventType?: string; limit?: number }) =>
    [...securityEventKeys.lists(), params] as const,
};

export function useAuditLog(params?: { entityType?: string; entityId?: string }) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: async () => {
      const qs = params ? buildQueryString(params) : '';
      return get<AuditLogEntry[]>(`${endpoints.audit.list}${qs}`);
    },
    enabled: !!(params?.entityType && params?.entityId),
  });
}

export function useSecurityEvents(params?: { eventType?: string; limit?: number }) {
  return useQuery({
    queryKey: securityEventKeys.list(params),
    queryFn: async () => {
      const qs = params ? buildQueryString(params) : '';
      return get<SecurityEvent[]>(`${endpoints.securityEvents.list}${qs}`);
    },
  });
}
