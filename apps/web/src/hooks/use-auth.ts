"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { post } from "@/lib/api";
import type { LoginRequest, LoginResponse } from "@/types/api";

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, setAuth, logout: storeLogout, initialize } = useAuthStore();

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const response = await post<LoginResponse>("/auth/login", credentials);
      setAuth(response.user, response.tokens);
      router.push("/dashboard");
      return response;
    },
    [setAuth, router]
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
      const response = await post<LoginResponse>("/auth/refresh", { refreshToken });
      setAuth(response.user, response.tokens);
    } catch {
      logout();
    }
  }, [setAuth, logout]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshSession,
    initialize,
  };
}
