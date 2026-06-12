"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { LoginForm } from "../login-form";
import { AuthBrandLayout } from "@/components/layout/auth-brand-layout";
import { usePublicBranding } from "@/hooks/use-public-branding";

export default function BrandedLoginPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const { branding, loaded } = usePublicBranding(slug);

  return (
    <AuthBrandLayout
      branding={branding}
      loaded={loaded}
      title="Sign in"
      subtitle={
        branding.loginWelcomeText || "Enter your credentials to access your account"
      }
      footer={
        <>
          Signing in to <span className="font-medium">{slug}</span>
        </>
      }
    >
      <LoginForm fixedTenantSlug={slug} accentColor={branding.brandColor} />
    </AuthBrandLayout>
  );
}
