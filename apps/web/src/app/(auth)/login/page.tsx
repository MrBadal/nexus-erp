"use client";

import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
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

          <LoginForm />

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
