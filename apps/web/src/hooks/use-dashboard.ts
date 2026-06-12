'use client';

import { useQuery } from '@tanstack/react-query';
import { get, endpoints } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────

export interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  status: string;
  total: string;
  balanceDue: string;
  issueDate: string;
  dueDate: string;
}

export interface RecentPayment {
  id: string;
  paymentNumber: string;
  type: string;
  amount: string;
  status: string;
  date: string;
  paymentMethod: string | null;
}

export interface OverdueInvoicesData {
  count: number;
  totalAmount: number;
}

export interface MonthlyRevenueTrend {
  month: string;
  revenue: number;
}

export interface DashboardKpis {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashBalance: number;
  recentInvoices: RecentInvoice[];
  recentPayments: RecentPayment[];
  overdueInvoices: OverdueInvoicesData;
  monthlyRevenueTrend: MonthlyRevenueTrend[];
}

// ─── Query Keys ────────────────────────────────────────────────────

const dashboardKeys = {
  all: ['dashboard'] as const,
  kpis: () => [...dashboardKeys.all, 'kpis'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────

export function useDashboardKpis(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.kpis(),
    queryFn: () => get<DashboardKpis>(endpoints.dashboard.kpis),
    enabled,
    staleTime: 60_000, // KPIs are fresh for 1 minute
    refetchInterval: 5 * 60_000, // Auto-refresh every 5 minutes
  });
}
