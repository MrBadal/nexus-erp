"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2, ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/hooks/use-auth";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  tenantSlug: z
    .string()
    .min(1, "Tenant slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lowercase letters, numbers, and hyphens only"
    ),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
      tenantSlug: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await forgotPassword({
        email: data.email,
        tenantSlug: data.tenantSlug,
      });
      setIsSuccess(true);
    } catch {
      // Always show success to prevent email enumeration
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white" style={{ backgroundColor: "#1B4F72" }}>
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg font-bold">
              N
            </div>
            <span className="text-xl font-bold">NexusERP</span>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold leading-tight">
            AI-Powered Enterprise<br />Resource Planning
          </h1>
          <p className="text-white/70 text-sm max-w-md">
            Secure access recovery for your organization. Reset your password
            and get back to managing your business.
          </p>
        </div>
        <p className="text-xs text-white/50">
          &copy; {new Date().getFullYear()} NexusERP. All rights reserved.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-6 py-12 dark:bg-slate-950">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white" style={{ backgroundColor: "#1B4F72" }}>
              N
            </div>
            <h1 className="text-2xl font-bold text-foreground">NexusERP</h1>
          </div>

          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <MailCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  If an account exists with that email, we&apos;ve sent a password reset link.
                  Please check your inbox and spam folder.
                </p>
              </div>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="mt-4 h-9 text-sm"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">Forgot password?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email and organization slug to receive a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Tenant Slug */}
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

                {/* Email */}
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

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-9 text-sm"
                  disabled={isSubmitting}
                  style={{ backgroundColor: "#1B4F72" }}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send reset link
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="font-medium hover:underline inline-flex items-center gap-1"
                  style={{ color: "#1B4F72" }}
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
