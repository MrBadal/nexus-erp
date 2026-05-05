import { create } from "zustand";
import type { User, AuthTokens, Tenant, Permission } from "@/types/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenant: Tenant | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, tokens: AuthTokens, tenant?: Tenant, permissions?: Permission[]) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (module: string, resource: string, action: string) => boolean;
  logout: () => void;
  initialize: () => void;
}

// Compute initial auth state synchronously from localStorage (no async, no flash)
const getInitialAuthState = () => {
  if (typeof window === "undefined") {
    return { user: null, accessToken: null, refreshToken: null, tenant: null, permissions: [], isAuthenticated: false };
  }
  const token = localStorage.getItem("nexus_access_token");
  const userStr = localStorage.getItem("nexus_user");
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr) as User;
      const tenantStr = localStorage.getItem("nexus_tenant");
      const permissionsStr = localStorage.getItem("nexus_permissions");
      return {
        user,
        accessToken: token,
        refreshToken: localStorage.getItem("nexus_refresh_token"),
        tenant: tenantStr ? (JSON.parse(tenantStr) as Tenant) : null,
        permissions: permissionsStr ? (JSON.parse(permissionsStr) as Permission[]) : [],
        isAuthenticated: true,
      };
    } catch {
      // fall through to unauthenticated
    }
  }
  return { user: null, accessToken: null, refreshToken: null, tenant: null, permissions: [], isAuthenticated: false };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...getInitialAuthState(),
  isLoading: false, // never show loading splash — init is synchronous

  setAuth: (user, tokens, tenant, permissions) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nexus_access_token", tokens.accessToken);
      localStorage.setItem("nexus_refresh_token", tokens.refreshToken);
      localStorage.setItem("nexus_user", JSON.stringify(user));
      if (tenant) localStorage.setItem("nexus_tenant", JSON.stringify(tenant));
      if (permissions) localStorage.setItem("nexus_permissions", JSON.stringify(permissions));
    }
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tenant: tenant ?? get().tenant,
      permissions: permissions ?? get().permissions,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setUser: (user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nexus_user", JSON.stringify(user));
    }
    set({ user });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  hasPermission: (module: string, resource: string, action: string) => {
    const { user, permissions } = get();
    if (!user) return false;
    if (user.role === "super_admin" || user.role === "admin") return true;
    return permissions.some(
      (p) => p.module === module && p.resource === resource && p.action === action
    );
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nexus_access_token");
      localStorage.removeItem("nexus_refresh_token");
      localStorage.removeItem("nexus_user");
      localStorage.removeItem("nexus_tenant");
      localStorage.removeItem("nexus_permissions");
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenant: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
    });
  },

  // Kept for backwards compatibility; truly a no-op now because state was
  // already loaded synchronously at store creation. Calling set() here would
  // create new array references on every mount and force every selector
  // subscriber to re-render unnecessarily.
  initialize: () => {
    if (get().isLoading) set({ isLoading: false });
  },
}));
