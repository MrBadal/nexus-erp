"use client";

import * as React from "react";

export interface PublicBranding {
  appName: string;
  logoUrl: string | null;
  brandColor: string;
  loginWelcomeText: string | null;
  loginBgUrl: string | null;
}

export const DEFAULT_BRANDING: PublicBranding = {
  appName: "NexusERP",
  logoUrl: null,
  brandColor: "#1B4F72",
  loginWelcomeText: null,
  loginBgUrl: null,
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

/**
 * Fetch a tenant's public (pre-auth) branding by org slug. Used by every
 * unauthenticated screen — branded login, forgot-password, set-password — so
 * the whole recovery flow keeps the tenant's look instead of falling back to
 * the generic NexusERP screen. Returns defaults when slug is empty or the
 * lookup fails (the backend also returns enumeration-safe defaults at 200).
 */
export function usePublicBranding(slug: string | null | undefined): {
  branding: PublicBranding;
  loaded: boolean;
} {
  const [branding, setBranding] = React.useState<PublicBranding>(DEFAULT_BRANDING);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!slug) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE}/auth/branding/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;
        const raw =
          data && typeof data === "object" && "data" in (data as Record<string, unknown>)
            ? (data as { data: unknown }).data
            : data;
        if (raw && typeof raw === "object") {
          const b = raw as Partial<PublicBranding>;
          setBranding({
            appName: b.appName || DEFAULT_BRANDING.appName,
            logoUrl: b.logoUrl ?? null,
            brandColor: b.brandColor || DEFAULT_BRANDING.brandColor,
            loginWelcomeText: b.loginWelcomeText ?? null,
            loginBgUrl: b.loginBgUrl ?? null,
          });
        }
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { branding, loaded };
}
