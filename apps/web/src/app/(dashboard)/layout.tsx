"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/stores/auth.store";
import {
  getRequiredPrefixesForPath,
  hasAnyPermissionPrefix,
} from "@/lib/route-permissions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, initialize, user } = useAuthStore();
  // Subscribe to the raw permissions reference (stable until store update).
  const rawPerms = useAuthStore((s) => s.permissions);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  // Auth gate: kick out unauthenticated users; route employees to ESS.
  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.roleSlug === "employee") {
      router.push("/ess");
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Permission gate: if the current path requires a permission prefix the user
  // doesn't have, send them back to /dashboard with a toast. Closes the
  // search-bar / URL-typing bypass while sidebar is permission-filtered.
  const userPerms = React.useMemo<string[]>(() => {
    return (rawPerms as unknown as Array<string | { module?: string; resource?: string }>)
      .map((p) =>
        typeof p === "string" ? p : `${p.module ?? ""}:${p.resource ?? ""}`,
      );
  }, [rawPerms]);
  const isAdmin =
    user?.roleSlug === "admin" || userPerms.includes("*");

  React.useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (isAdmin) return; // admins reach everything
    const required = getRequiredPrefixesForPath(pathname);
    if (!required) return; // path is unguarded
    if (!hasAnyPermissionPrefix(userPerms, required)) {
      toast.error("You don't have access to that section");
      router.replace("/dashboard");
    }
  }, [pathname, isLoading, isAuthenticated, isAdmin, userPerms, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading NexusERP...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  );
}
