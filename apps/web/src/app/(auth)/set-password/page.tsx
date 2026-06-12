"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import api, { endpoints, apiErrorMessage } from "@/lib/api";
import { AuthBrandLayout } from "@/components/layout/auth-brand-layout";
import { usePublicBranding } from "@/hooks/use-public-branding";

/**
 * Set-password page. Handles BOTH:
 *   - First-time activation (admin issued an invite link)
 *   - Forgot-password reset (user requested via /forgot-password)
 *
 * Both flows hit POST /auth/reset-password which validates the JWT,
 * hashes the new password, and flips the user status to 'active'.
 *
 * Wrapped in Suspense because useSearchParams() needs it under
 * Next 15's strict mode for static-prerender compatibility.
 */
const schema = z
  .object({
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[a-z]/, "Must contain a lowercase letter")
      .regex(/[0-9]/, "Must contain a digit")
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, "Must contain a special character"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

function SetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  // Slug carried in the reset/invite email link so this screen stays on-brand.
  const orgSlug = searchParams.get("org") ?? "";
  const { branding, loaded } = usePublicBranding(orgSlug);
  const loginHref = orgSlug ? `/login/${encodeURIComponent(orgSlug)}` : "/login";

  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toast.error("Activation link is missing or malformed");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(endpoints.auth.resetPassword, {
        token,
        newPassword: values.password,
      });
      setDone(true);
      toast.success("Password set. You can now log in.");
      setTimeout(() => router.push(loginHref), 1500);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to set password"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthBrandLayout branding={branding} loaded={loaded} title="Link missing or expired">
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            The activation/reset link is malformed or expired. Ask your admin to
            issue a new link from <strong>Settings → Users</strong>, or request a
            password reset again.
          </p>
        </div>
        <p className="mt-4 text-center text-sm">
          <Link
            href={orgSlug ? `/forgot-password?org=${encodeURIComponent(orgSlug)}` : "/forgot-password"}
            className="font-medium hover:underline"
            style={{ color: branding.brandColor }}
          >
            Request a new reset link
          </Link>
        </p>
      </AuthBrandLayout>
    );
  }

  if (done) {
    return (
      <AuthBrandLayout branding={branding} loaded={loaded} title="Password set">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
          <p className="text-sm text-muted-foreground">
            Redirecting you to the login page…
          </p>
        </div>
      </AuthBrandLayout>
    );
  }

  return (
    <AuthBrandLayout
      branding={branding}
      loaded={loaded}
      title="Set your password"
      subtitle={`Choose a strong password to sign in to ${branding.appName}.`}
      footer={
        <Link
          href={loginHref}
          className="font-medium hover:underline"
          style={{ color: branding.brandColor }}
        >
          Go to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="New password" required error={errors.password?.message}>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Min 12 chars, mix upper/lower/digit/symbol"
            {...register("password")}
          />
        </FormField>

        <FormField
          label="Confirm password"
          required
          error={errors.confirmPassword?.message}
        >
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Re-type the password"
            {...register("confirmPassword")}
          />
        </FormField>

        <Button
          type="submit"
          className="w-full"
          disabled={submitting}
          style={{ backgroundColor: branding.brandColor }}
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Set password
        </Button>
      </form>
    </AuthBrandLayout>
  );
}

export default function SetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SetPasswordInner />
    </React.Suspense>
  );
}
