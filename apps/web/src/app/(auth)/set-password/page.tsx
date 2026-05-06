"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import api, { endpoints } from "@/lib/api";

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
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: unknown) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to set password");
      toast.error(
        Array.isArray(message)
          ? message.join("; ")
          : typeof message === "string"
            ? message
            : "Failed to set password",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-xl border bg-background p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Activation link missing</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          The activation/reset link is malformed or expired. Ask your admin
          to issue a new link from <strong>Settings → Users</strong>, or
          request a password reset from{" "}
          <Link href="/forgot-password" className="text-primary underline">
            Forgot password
          </Link>
          .
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-background p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
        <h1 className="text-lg font-semibold">Password set</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Redirecting you to the login page…
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl border bg-background p-8 shadow-sm"
    >
      <div>
        <h1 className="text-lg font-semibold">Set your password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password. You&apos;ll use it to sign in to NexusERP.
        </p>
      </div>

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

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Set password
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Already have access?{" "}
        <Link href="/login" className="text-primary underline">
          Go to login
        </Link>
      </p>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Building2 className="h-7 w-7 text-primary" />
          <span className="text-xl font-semibold">NexusERP</span>
        </div>
        <React.Suspense
          fallback={
            <div className="rounded-xl border bg-background p-8 text-center shadow-sm">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <SetPasswordInner />
        </React.Suspense>
      </div>
    </div>
  );
}
