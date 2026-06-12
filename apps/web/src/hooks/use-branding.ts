'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export interface TenantBranding {
  appName: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  loginWelcomeText: string | null;
  loginBgUrl: string | null;
  companyName: string | null;
}

export const brandingKeys = {
  all: ['settings', 'branding'] as const,
};

/**
 * Tenant branding for the in-app shell (sidebar logo/name, accent color).
 * Readable by every authenticated user — backed by GET /settings/branding
 * (JWT only, no permission required). Long staleTime: branding rarely changes.
 */
export function useBranding() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: brandingKeys.all,
    queryFn: () => get<TenantBranding>('/settings/branding'),
    enabled: isAuthenticated,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
  });
}

/** Invalidate cached branding (call after saving the branding form). */
export function useInvalidateBranding() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: brandingKeys.all });
}
