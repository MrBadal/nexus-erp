"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import api, { endpoints } from "@/lib/api";
import type {
  LoginRequest,
  ForgotPasswordRequest,
} from "@/types/api";

/**
 * The NestJS auth endpoints return raw JSON (not wrapped in ApiResponse),
 * so we use `api.post` directly instead of the `post<T>` helper which
 * expects `{ data: T }` wrapping.
 */

interface ApiAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  };
}

function mapAuthResponse(data: ApiAuthResponse) {
  const now = new Date().toISOString();
  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      fullName: `${data.user.firstName} ${data.user.lastName}`,
      avatarUrl: data.user.avatarUrl ?? undefined,
      role: "admin" as const,
      tenantId: data.user.tenantId,
      isActive: true,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    },
    tokens: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: 3600,
    },
    tenant: {
      id: data.user.tenantId,
      name: data.user.tenantName,
      slug: data.user.tenantSlug,
      currency: "USD",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function useAuth() {
  const router = useRouter();
  const {
    user,
    tenant,
    permissions,
    isAuthenticated,
    isLoading,
    setAuth,
    hasPermission,
    logout: storeLogout,
    initialize,
  } = useAuthStore();

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const { data } = await api.post<ApiAuthResponse>(endpoints.auth.login, credentials);
      const mapped = mapAuthResponse(data);
      setAuth(mapped.user, mapped.tokens, mapped.tenant);
      router.push("/dashboard");
      return mapped;
    },
    [setAuth, router]
  );

  const register = useCallback(
    async (data: {
      tenantName: string;
      tenantSlug: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      billingEmail: string;
    }) => {
      const { data: responseData } = await api.post<ApiAuthResponse>(endpoints.auth.register, data);
      const mapped = mapAuthResponse(responseData);
      setAuth(mapped.user, mapped.tokens, mapped.tenant);
      router.push("/dashboard");
      return mapped;
    },
    [setAuth, router]
  );

  const forgotPassword = useCallback(
    async (data: ForgotPasswordRequest) => {
      await api.post(endpoints.auth.forgotPassword, data);
    },
    []
  );

  const logout = useCallback(() => {
    storeLogout();
    router.push("/login");
  }, [storeLogout, router]);

  const refreshSession = useCallback(async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      logout();
      return;
    }
    try {
      const { data } = await api.post<ApiAuthResponse>(endpoints.auth.refresh, { refreshToken });
      const mapped = mapAuthResponse(data);
      setAuth(mapped.user, mapped.tokens, mapped.tenant);
    } catch {
      logout();
    }
  }, [setAuth, logout]);

  return {
    user,
    tenant,
    permissions,
    isAuthenticated,
    isLoading,
    login,
    register,
    forgotPassword,
    logout,
    refreshSession,
    hasPermission,
    initialize,
  };
}
