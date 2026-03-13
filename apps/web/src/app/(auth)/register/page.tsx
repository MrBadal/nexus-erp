"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/hooks/use-auth";

const registerSchema = z
  .object({
    companyName: z
      .string()
      .min(1, "Company name is required")
      .max(255, "Company name must be 255 characters or fewer"),
    companySlug: z
      .string()
      .min(1, "Company slug is required")
      .max(100, "Slug must be 100 characters or fewer")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Lowercase letters, numbers, and hyphens only"
      ),
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(100, "First name must be 100 characters or fewer"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(100, "Last name must be 100 characters or fewer"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[a-z]/, "Must contain a lowercase letter")
      .regex(/[0-9]/, "Must contain a digit")
      .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    billingEmail: z.string().email("Please enter a valid billing email"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: "12+ characters", met: password.length >= 12 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Digit", met: /[0-9]/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getStrengthColor(metCount: number): string {
  if (metCount <= 2) return "bg-red-500";
  if (metCount <= 4) return "bg-yellow-500";
  return "bg-green-500";
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: "",
      companySlug: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      billingEmail: "",
    },
  });

  const password = watch("password") || "";
  const email = watch("email");
  const companyName = watch("companyName");

  const requirements = getPasswordRequirements(password);
  const metCount = requirements.filter((r) => r.met).length;
  const strengthPercent = (metCount / requirements.length) * 100;

  // Auto-generate slug from company name
  React.useEffect(() => {
    if (companyName) {
      setValue("companySlug", generateSlug(companyName), { shouldValidate: true });
    }
  }, [companyName, setValue]);

  // Default billing email to user email
  const [billingEmailTouched, setBillingEmailTouched] = React.useState(false);
  React.useEffect(() => {
    if (!billingEmailTouched && email) {
      setValue("billingEmail", email, { shouldValidate: true });
    }
  }, [email, billingEmailTouched, setValue]);

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      await registerUser({
        tenantName: data.companyName,
        tenantSlug: data.companySlug,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        billingEmail: data.billingEmail,
      });
      toast.success("Account created successfully!");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Registration failed. Please try again.");
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
            Set up your organization in minutes. Get started with intelligent
            finance, inventory, and operations management.
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
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white" style={{ backgroundColor: "#1B4F72" }}>
              N
            </div>
            <h1 className="text-2xl font-bold text-foreground">NexusERP</h1>
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-semibold text-foreground">Create your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up your organization to get started
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Company Name */}
            <FormField label="Company Name" required error={errors.companyName?.message}>
              <Input
                placeholder="Acme Corp"
                className="h-9 text-sm"
                disabled={isSubmitting}
                {...register("companyName")}
              />
            </FormField>

            {/* Company Slug */}
            <FormField
              label="Organization Slug"
              required
              error={errors.companySlug?.message}
              description={watch("companySlug") ? `Your URL: ${watch("companySlug")}.nexuserp.com` : undefined}
            >
              <Input
                placeholder="acme-corp"
                className="h-9 text-sm"
                disabled={isSubmitting}
                {...register("companySlug")}
              />
            </FormField>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" required error={errors.firstName?.message}>
                <Input
                  placeholder="John"
                  className="h-9 text-sm"
                  disabled={isSubmitting}
                  {...register("firstName")}
                />
              </FormField>
              <FormField label="Last Name" required error={errors.lastName?.message}>
                <Input
                  placeholder="Doe"
                  className="h-9 text-sm"
                  disabled={isSubmitting}
                  {...register("lastName")}
                />
              </FormField>
            </div>

            {/* Email */}
            <FormField label="Email" required error={errors.email?.message}>
              <Input
                type="email"
                placeholder="john@acme.com"
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
                placeholder="Create a strong password"
                autoComplete="new-password"
                className="h-9 text-sm"
                disabled={isSubmitting}
                {...register("password")}
              />
            </FormField>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="space-y-2">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getStrengthColor(metCount)}`}
                    style={{ width: `${strengthPercent}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {requirements.map((req) => (
                    <div key={req.label} className="flex items-center gap-1.5">
                      {req.met ? (
                        <Check className="h-3 w-3 text-green-500 shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <span
                        className={`text-xs ${req.met ? "text-green-600" : "text-muted-foreground"}`}
                      >
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <FormField label="Confirm Password" required error={errors.confirmPassword?.message}>
              <Input
                type="password"
                placeholder="Confirm your password"
                autoComplete="new-password"
                className="h-9 text-sm"
                disabled={isSubmitting}
                {...register("confirmPassword")}
              />
            </FormField>

            {/* Billing Email */}
            <FormField label="Billing Email" required error={errors.billingEmail?.message}>
              <Input
                type="email"
                placeholder="billing@acme.com"
                className="h-9 text-sm"
                disabled={isSubmitting}
                {...register("billingEmail", {
                  onChange: () => setBillingEmailTouched(true),
                })}
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
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium hover:underline"
              style={{ color: "#1B4F72" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
