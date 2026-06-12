"use client";

import * as React from "react";
import type { PublicBranding } from "@/hooks/use-public-branding";

interface AuthBrandLayoutProps {
  branding: PublicBranding;
  loaded?: boolean;
  /** Heading shown above the form on the right panel. */
  title: string;
  /** Sub-text under the heading. */
  subtitle?: string;
  /** Optional footer note under the form (e.g. "Resetting password for acme"). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Two-panel branded shell for unauthenticated screens (login, forgot-password,
 * set-password). Applies the tenant's logo, name, accent color, welcome text
 * and optional background image so the whole pre-auth flow stays on-brand.
 */
export function AuthBrandLayout({
  branding,
  loaded = true,
  title,
  subtitle,
  footer,
  children,
}: AuthBrandLayoutProps) {
  const leftPanelStyle: React.CSSProperties = branding.loginBgUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${branding.loginBgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: branding.brandColor };

  const Logo = ({ size }: { size: "lg" | "xl" }) =>
    branding.logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={branding.logoUrl}
        alt={`${branding.appName} logo`}
        className={
          size === "lg"
            ? "h-10 w-10 rounded-lg object-contain bg-white/90 p-1"
            : "mx-auto mb-3 h-12 w-12 rounded-xl object-contain"
        }
      />
    ) : (
      <div
        className={
          size === "lg"
            ? "flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg font-bold text-white"
            : "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
        }
        style={size === "xl" ? { backgroundColor: branding.brandColor } : undefined}
      >
        {branding.appName.charAt(0).toUpperCase()}
      </div>
    );

  return (
    <div
      className="flex min-h-screen transition-opacity duration-200"
      style={{ opacity: loaded ? 1 : 0 }}
    >
      {/* Left panel — tenant brand */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={leftPanelStyle}
      >
        <div className="flex items-center gap-3">
          <Logo size="lg" />
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

      {/* Right panel — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-6 py-12 dark:bg-slate-950">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <Logo size="xl" />
            <h1 className="text-2xl font-bold text-foreground">{branding.appName}</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>

          {children}

          {footer ? (
            <div className="mt-6 text-center text-xs text-muted-foreground">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
