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

export interface LoginFormProps {
  /**
   * When set (branded login page /login/<slug>), the Organization field is
   * pre-filled and hidden — the user only enters email + password.
   */
  fixedTenantSlug?: string;
  /** Accent color for the submit button and links. Defaults to NexusERP blue. */
  accentColor?: string;
}

export function LoginForm({ fixedTenantSlug, accentColor = "#1B4F72" }: LoginFormProps) {
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
      tenantSlug: fixedTenantSlug ?? "",
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Tenant Slug — hidden + pre-filled on branded login pages */}
      {fixedTenantSlug ? (
        <input type="hidden" {...register("tenantSlug")} />
      ) : (
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
      )}

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
      <FormField label="Password" required error={errors.password?.message}>
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
            onCheckedChange={(checked) => setValue("rememberMe", checked === true)}
            disabled={isSubmitting}
          />
          <span className="text-xs text-muted-foreground">Remember me</span>
        </label>
        <Link
          href={
            fixedTenantSlug
              ? `/forgot-password?org=${encodeURIComponent(fixedTenantSlug)}`
              : "/forgot-password"
          }
          className="text-xs font-medium hover:underline"
          style={{ color: accentColor }}
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full h-9 text-sm"
        disabled={isSubmitting}
        style={{ backgroundColor: accentColor }}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}
