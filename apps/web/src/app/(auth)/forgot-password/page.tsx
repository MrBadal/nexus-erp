"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/hooks/use-auth";
import { AuthBrandLayout } from "@/components/layout/auth-brand-layout";
import { usePublicBranding } from "@/hooks/use-public-branding";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  tenantSlug: z
    .string()
    .min(1, "Organization is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lowercase letters, numbers, and hyphens only",
    ),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  // Slug arrives from the branded login link (/forgot-password?org=<slug>).
  const orgSlug = searchParams.get("org") ?? "";
  const { branding, loaded } = usePublicBranding(orgSlug);

  const { forgotPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "", tenantSlug: orgSlug },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await forgotPassword({ email: data.email, tenantSlug: data.tenantSlug });
      setIsSuccess(true);
    } catch {
      // Always show success to prevent email enumeration.
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const backHref = orgSlug ? `/login/${encodeURIComponent(orgSlug)}` : "/login";

  if (isSuccess) {
    return (
      <AuthBrandLayout branding={branding} loaded={loaded} title="Check your email">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <MailCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            If an account exists with that email, we&apos;ve sent a password reset
            link. Please check your inbox and spam folder.
          </p>
          <Link href={backHref}>
            <Button variant="outline" className="mt-2 h-9 text-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </div>
      </AuthBrandLayout>
    );
  }

  return (
    <AuthBrandLayout
      branding={branding}
      loaded={loaded}
      title="Forgot password?"
      subtitle={
        orgSlug
          ? "Enter your email to receive a reset link"
          : "Enter your email and organization to receive a reset link"
      }
      footer={
        <Link
          href={backHref}
          className="font-medium hover:underline inline-flex items-center gap-1"
          style={{ color: branding.brandColor }}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Organization — hidden + pre-filled when arriving from a branded login. */}
        {orgSlug ? (
          <input type="hidden" {...register("tenantSlug")} />
        ) : (
          <FormField label="Organization" required error={errors.tenantSlug?.message}>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="your-company"
                className="pl-9 h-9 text-sm"
                disabled={isSubmitting}
                {...register("tenantSlug")}
              />
            </div>
          </FormField>
        )}

        <FormField label="Email" required error={errors.email?.message}>
          <Input
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            className="h-9 text-sm"
            disabled={isSubmitting}
            {...register("email")}
          />
        </FormField>

        <Button
          type="submit"
          className="w-full h-9 text-sm"
          disabled={isSubmitting}
          style={{ backgroundColor: branding.brandColor }}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
    </AuthBrandLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ForgotPasswordInner />
    </React.Suspense>
  );
}
