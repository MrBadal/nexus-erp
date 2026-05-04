'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, buildQueryString } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AssetAssignment {
  id: string;
  tenantId: string;
  assetId: string;
  employeeId: string;
  assignedAt: string;
  returnedAt: string | null;
  conditionAtAssign: string | null;
  conditionAtReturn: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface OrgChartNode {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  designationId?: string | null;
  designation: string | null;
  status?: string;
  profileImageUrl?: string | null;
  children: OrgChartNode[];
}

export interface EmployeeTeamResponse {
  employee?: Record<string, unknown>;
  manager: Record<string, unknown> | null;
  peers: Record<string, unknown>[];
  directReports: Record<string, unknown>[];
}

interface AssignmentListParams {
  assetId?: string;
  employeeId?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

// ─── Query keys ─────────────────────────────────────────────────────────────

const ASSIGNMENT_KEY = ['asset-assignments'] as const;
const ORG_CHART_KEY = ['hr', 'org-chart'] as const;
const TEAM_KEY = (id: string) => ['hr', 'employees', id, 'team'] as const;

// ─── Org chart ──────────────────────────────────────────────────────────────

export function useOrgChart() {
  return useQuery({
    queryKey: ORG_CHART_KEY,
    queryFn: async () => get<OrgChartNode[]>('/hr/employees/org-chart'),
    staleTime: 60_000,
  });
}

export function useEmployeeTeam(employeeId: string) {
  return useQuery({
    queryKey: TEAM_KEY(employeeId),
    queryFn: async () =>
      get<EmployeeTeamResponse>(`/hr/employees/${employeeId}/team`),
    enabled: !!employeeId,
    staleTime: 60_000,
  });
}

// ─── Asset assignments ──────────────────────────────────────────────────────

export function useAssetAssignments(params?: AssignmentListParams) {
  return useQuery({
    queryKey: [...ASSIGNMENT_KEY, 'list', params],
    queryFn: async () => {
      const qs = params
        ? buildQueryString(
            params as Record<string, string | number | boolean | undefined | null>,
          )
        : '';
      return get<AssetAssignment[]>(`/hr/asset-assignments${qs}`);
    },
    staleTime: 30_000,
  });
}

export function useEmployeeAssetAssignments(employeeId: string) {
  return useAssetAssignments(employeeId ? { employeeId } : undefined);
}

export function useAssignAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      assetId: string;
      employeeId: string;
      conditionAtAssign?: string;
      notes?: string;
    }) => post<AssetAssignment>('/hr/asset-assignments', data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_KEY });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      if (vars?.employeeId) {
        queryClient.invalidateQueries({
          queryKey: ['hr', 'employees', vars.employeeId],
        });
      }
    },
  });
}

export function useReturnAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      conditionAtReturn?: string;
      notes?: string;
    }) => {
      const { id, ...body } = params;
      return post<AssetAssignment>(`/hr/asset-assignments/${id}/return`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENT_KEY });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
