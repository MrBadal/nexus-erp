"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/hooks/use-auth";

const loginSchema = z.object({
  tenantSlug: z
    .string()
    .min(1, "Tenant slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantSlug: "",
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await login({
        email: data.email,
        password: data.password,
        tenantSlug: data.tenantSlug,
        rememberMe: data.rememberMe,
      });
      toast.success("Welcome back!");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string }; status?: number } };
      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      if (status === 404) {
        toast.error(message || "Tenant not found. Please check your organization slug.");
      } else if (status === 423) {
        toast.error(message || "Account locked. Please contact your administrator.");
      } else {
        toast.error(message || "Invalid credentials. Please try again.");
      }
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
            Streamline your business operations with intelligent automation,
            real-time analytics, and seamless multi-tenant management.
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

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Tenant Slug */}
            <FormField label="Organization" required error={errors.tenantSlug?.message}>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="your-company"
                  autoComplete="organization"
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

            {/* Password */}
            <FormField
              label="Password"
              required
              error={errors.password?.message}
            >
              <Input
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                className="h-9 text-sm"
                disabled={isSubmitting}
                {...register("password")}
              />
            </FormField>

            {/* Remember me + forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setValue("rememberMe", checked === true)
                  }
                  disabled={isSubmitting}
                />
                <span className="text-xs text-muted-foreground">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium hover:underline"
                style={{ color: "#1B4F72" }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-9 text-sm"
              disabled={isSubmitting}
              style={{ backgroundColor: "#1B4F72" }}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium hover:underline"
              style={{ color: "#1B4F72" }}
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
