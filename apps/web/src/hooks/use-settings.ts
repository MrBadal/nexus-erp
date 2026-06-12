'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints } from '@/lib/api';

// ─── Users ─────────────────────────────────────────────────────────────────
export interface UserRecord {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  roleId: string | null;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: () => get<UserRecord[]>(endpoints.users.list),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => get<UserRecord>(endpoints.users.get(id)),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => post<UserRecord>(endpoints.users.create, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      put<UserRecord>(endpoints.users.update(id), data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(endpoints.users.delete(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

// ─── Roles ─────────────────────────────────────────────────────────────────
export interface RoleRecord {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  hierarchyLevel: number;
  createdAt: string;
  updatedAt: string;
}

const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
};

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: () => get<RoleRecord[]>(endpoints.roles.list),
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => get<RoleRecord>(endpoints.roles.get(id)),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => post<RoleRecord>(endpoints.roles.create, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      put<RoleRecord>(endpoints.roles.update(id), data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: roleKeys.detail(id) });
      qc.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(endpoints.roles.delete(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

// ─── Organization Settings ─────────────────────────────────────────────────

export interface OrganizationSettings {
  id: string;
  tenantId: string;
  companyName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  industry: string | null;
  logoUrl: string | null;
  defaultCurrency: string;
  fiscalYearStartMonth: number;
  timezone: string;
  dateFormat: string;
  setupComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

const settingsKeys = {
  all: ['settings'] as const,
  organization: () => [...settingsKeys.all, 'organization'] as const,
};

export function useOrganizationSettings() {
  return useQuery({
    queryKey: settingsKeys.organization(),
    queryFn: () => get<OrganizationSettings>(endpoints.settings.organization),
  });
}

export function useUpdateOrganizationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OrganizationSettings>) =>
      put<OrganizationSettings>(endpoints.settings.organization, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.organization() });
    },
  });
}
