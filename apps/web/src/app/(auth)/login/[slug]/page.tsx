"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { LoginForm } from "../login-form";

interface PublicBranding {
  appName: string;
  logoUrl: string | null;
  brandColor: string;
  loginWelcomeText: string | null;
  loginBgUrl: string | null;
}

const DEFAULT_BRANDING: PublicBranding = {
  appName: "NexusERP",
  logoUrl: null,
  brandColor: "#1B4F72",
  loginWelcomeText: null,
  loginBgUrl: null,
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function BrandedLoginPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [branding, setBranding] = React.useState<PublicBranding>(DEFAULT_BRANDING);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    // Plain fetch — this endpoint is public (pre-auth), no token attached.
    fetch(`${API_BASE}/auth/branding/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;
        // Handle both raw and { data: ... } wrapped responses.
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

  const leftPanelStyle: React.CSSProperties = branding.loginBgUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${branding.loginBgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: branding.brandColor };

  const logo = branding.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={branding.logoUrl}
      alt={`${branding.appName} logo`}
      className="h-10 w-10 rounded-lg object-contain bg-white/90 p-1"
    />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg font-bold text-white">
      {branding.appName.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <div
      className="flex min-h-screen transition-opacity duration-200"
      style={{ opacity: loaded ? 1 : 0 }}
    >
      {/* Left panel - tenant brand */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={leftPanelStyle}
      >
        <div className="flex items-center gap-3">
          {logo}
          <span className="text-xl font-bold">{branding.appName}</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold leading-tight">
            {branding.loginWelcomeText || `Welcome to ${branding.appName}`}
          </h1>
        </div>
        <p className="text-xs text-white/50">
          &copy; {new Date().getFullYear()} {branding.appName}. All rights reserved.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-6 py-12 dark:bg-slate-950">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={`${branding.appName} logo`}
                className="mx-auto mb-3 h-12 w-12 rounded-xl object-contain"
              />
            ) : (
              <div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
                style={{ backgroundColor: branding.brandColor }}
              >
                {branding.appName.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground">{branding.appName}</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {branding.loginWelcomeText || "Enter your credentials to access your account"}
            </p>
          </div>

          <LoginForm fixedTenantSlug={slug} accentColor={branding.brandColor} />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Signing in to <span className="font-medium">{slug}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
