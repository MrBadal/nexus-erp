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

export default api;
