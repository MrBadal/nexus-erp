import { create } from "zustand";
import type { User, AuthTokens } from "@/types/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, tokens) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nexus_access_token", tokens.accessToken);
      localStorage.setItem("nexus_refresh_token", tokens.refreshToken);
      localStorage.setItem("nexus_user", JSON.stringify(user));
    }
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nexus_access_token");
      localStorage.removeItem("nexus_refresh_token");
      localStorage.removeItem("nexus_user");
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initialize: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("nexus_access_token");
      const refreshToken = localStorage.getItem("nexus_refresh_token");
      const userStr = localStorage.getItem("nexus_user");

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as User;
          set({
            user,
            accessToken: token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    }
  },
}));
