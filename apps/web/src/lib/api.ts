import axios, { type AxiosError, type AxiosResponse } from "axios";
import type { ApiResponse } from "@/types/api";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor: attach auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("nexus_access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors globally
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiResponse<null>>) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("nexus_access_token");
        localStorage.removeItem("nexus_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Typed request helpers
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url, { params });
  return response.data.data;
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await api.post<ApiResponse<T>>(url, data);
  return response.data.data;
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  const response = await api.put<ApiResponse<T>>(url, data);
  return response.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const response = await api.delete<ApiResponse<T>>(url);
  return response.data.data;
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    mfaVerify: '/auth/mfa/verify',
  },
  accounts: {
    list: '/finance/accounts',
    tree: '/finance/accounts/tree',
    get: (id: string) => `/finance/accounts/${id}`,
    create: '/finance/accounts',
    update: (id: string) => `/finance/accounts/${id}`,
    delete: (id: string) => `/finance/accounts/${id}`,
  },
  journalEntries: {
    list: '/finance/journal-entries',
    get: (id: string) => `/finance/journal-entries/${id}`,
    create: '/finance/journal-entries',
    update: (id: string) => `/finance/journal-entries/${id}`,
    post: (id: string) => `/finance/journal-entries/${id}/post`,
    reverse: (id: string) => `/finance/journal-entries/${id}/reverse`,
    delete: (id: string) => `/finance/journal-entries/${id}`,
  },
  invoices: {
    list: '/finance/invoices',
    get: (id: string) => `/finance/invoices/${id}`,
    create: '/finance/invoices',
    update: (id: string) => `/finance/invoices/${id}`,
    confirm: (id: string) => `/finance/invoices/${id}/confirm`,
    send: (id: string) => `/finance/invoices/${id}/send`,
    payment: (id: string) => `/finance/invoices/${id}/payment`,
    void: (id: string) => `/finance/invoices/${id}/void`,
    delete: (id: string) => `/finance/invoices/${id}`,
  },
  users: {
    list: '/users',
    me: '/users/me',
    get: (id: string) => `/users/${id}`,
  },
};

export default api;
