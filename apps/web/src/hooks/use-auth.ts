"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { post } from "@/lib/api";
import { endpoints } from "@/lib/api";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
} from "@/types/api";

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
      const response = await post<LoginResponse>(endpoints.auth.login, credentials);
      setAuth(response.user, response.tokens, response.tenant, response.permissions);
      router.push("/dashboard");
      return response;
    },
    [setAuth, router]
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      const response = await post<RegisterResponse>(endpoints.auth.register, data);
      setAuth(response.user, response.tokens, response.tenant, response.permissions);
      router.push("/dashboard");
      return response;
    },
    [setAuth, router]
  );

  const forgotPassword = useCallback(
    async (data: ForgotPasswordRequest) => {
      await post<{ message: string }>(endpoints.auth.forgotPassword, data);
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
      const response = await post<LoginResponse>(endpoints.auth.refresh, { refreshToken });
      setAuth(response.user, response.tokens, response.tenant, response.permissions);
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
