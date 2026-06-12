"use client";

import * as React from "react";
import { useBranding, type TenantBranding } from "@/hooks/use-branding";

const DEFAULT_BRAND_COLOR = "#1B4F72";

const BrandContext = React.createContext<TenantBranding | null>(null);

/**
 * Fetches the tenant's branding once (long staleTime) and:
 *  1. Sets the `--brand` CSS custom property on <html> so any element can
 *     use `var(--brand)` / `bg-[var(--brand)]` for the tenant accent color.
 *  2. Exposes the branding object via context — read it with `useBrand()`.
 *
 * Mount once inside the authenticated dashboard layout, wrapping the shell.
 */
export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { data } = useBranding();

  React.useEffect(() => {
    const color = data?.brandColor || DEFAULT_BRAND_COLOR;
    document.documentElement.style.setProperty("--brand", color);
    return () => {
      document.documentElement.style.removeProperty("--brand");
    };
  }, [data?.brandColor]);

  return <BrandContext.Provider value={data ?? null}>{children}</BrandContext.Provider>;
}

/**
 * Tenant branding from BrandProvider. Returns null while loading or when
 * unauthenticated — callers should fall back to the default NexusERP brand.
 */
export function useBrand(): TenantBranding | null {
  return React.useContext(BrandContext);
}
