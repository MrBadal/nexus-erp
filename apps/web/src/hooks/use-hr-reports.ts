'use client';

import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface PfReturnRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  uanNumber: string | null;
  basic: number;
  epf: number;
  eps: number;
  employerEpfTotal: number;
}

export interface PfReturn {
  period: string;
  rows: PfReturnRow[];
  totals: { basic: number; epf: number; eps: number; employerEpfTotal: number };
}

export interface EsiReturnRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  esicNumber: string | null;
  gross: number;
  employee: number;
  employer: number;
}

export interface EsiReturn {
  period: string;
  rows: EsiReturnRow[];
  totals: { gross: number; employee: number; employer: number };
}

export interface PtRegisterRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  state: string | null;
  amount: number;
}

export interface PtRegister {
  period: string;
  rows: PtRegisterRow[];
  byState: Record<string, number>;
  total: number;
}

export interface TdsQuarterlyRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  panNumber: string | null;
  period: string;
  tds: number;
}

export interface TdsQuarterly {
  fiscalYear: string;
  quarter: string;
  periods: string[];
  rows: TdsQuarterlyRow[];
  totals: { tds: number };
}

export interface GratuityProvision {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  fiscalYear: string;
  lastBasic: string;
  completedYears: string;
  gratuityAmount: string;
  providedAt: string;
}

export interface RunGratuityResult {
  created: number;
  skipped: number;
  ineligible: number;
  provisions: string[];
}

// ──────────────────────────────────────────────────────────
// Statutory Reports
// ──────────────────────────────────────────────────────────

export function usePfReturn(fy: string, month: string, enabled = true) {
  return useQuery<PfReturn>({
    queryKey: ['hr-reports', 'pf-return', fy, month],
    queryFn: () => get<PfReturn>(`/hr/reports/pf-return/${fy}/${month}`),
    enabled: enabled && Boolean(fy) && Boolean(month),
  });
}

export function useEsiReturn(fy: string, month: string, enabled = true) {
  return useQuery<EsiReturn>({
    queryKey: ['hr-reports', 'esi-return', fy, month],
    queryFn: () => get<EsiReturn>(`/hr/reports/esi-return/${fy}/${month}`),
    enabled: enabled && Boolean(fy) && Boolean(month),
  });
}

export function usePtRegister(fy: string, month: string, enabled = true) {
  return useQuery<PtRegister>({
    queryKey: ['hr-reports', 'pt-register', fy, month],
    queryFn: () => get<PtRegister>(`/hr/reports/pt-register/${fy}/${month}`),
    enabled: enabled && Boolean(fy) && Boolean(month),
  });
}

export function useTdsQuarterly(fy: string, quarter: string, enabled = true) {
  return useQuery<TdsQuarterly>({
    queryKey: ['hr-reports', 'tds-quarterly', fy, quarter],
    queryFn: () => get<TdsQuarterly>(`/hr/reports/tds-quarterly/${fy}/${quarter}`),
    enabled: enabled && Boolean(fy) && Boolean(quarter),
  });
}

// ──────────────────────────────────────────────────────────
// Gratuity
// ──────────────────────────────────────────────────────────

export function useGratuityProvisions(fy?: string) {
  const qs = fy ? `?fy=${encodeURIComponent(fy)}` : '';
  return useQuery<GratuityProvision[]>({
    queryKey: ['hr-gratuity', 'provisions', fy ?? 'all'],
    queryFn: () => get<GratuityProvision[]>(`/hr/gratuity/provisions${qs}`),
  });
}

export function useRunGratuityProvisioning() {
  const qc = useQueryClient();
  return useMutation<RunGratuityResult, Error, string>({
    mutationFn: (fy: string) => post<RunGratuityResult>(`/hr/gratuity/provisions/run/${fy}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-gratuity'] });
    },
  });
}

// ──────────────────────────────────────────────────────────
// Form 16 — PDF download (binary, axios direct)
// ──────────────────────────────────────────────────────────

export async function downloadForm16(employeeId: string, fy: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_access_token') : null;
  const tenantStr = typeof window !== 'undefined' ? localStorage.getItem('nexus_tenant') : null;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantStr) {
    try {
      const tenant = JSON.parse(tenantStr);
      if (tenant?.id) headers['X-Tenant-ID'] = tenant.id;
    } catch {
      // ignore
    }
  }

  const response = await axios.get(`${baseUrl}/hr/payroll/form-16/${employeeId}/${fy}`, {
    responseType: 'blob',
    headers,
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `form-16-${employeeId}-${fy}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────────────────
// CSV utility
// ──────────────────────────────────────────────────────────

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
