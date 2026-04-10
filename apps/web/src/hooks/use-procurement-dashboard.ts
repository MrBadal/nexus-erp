'use client';

import { useQuery } from '@tanstack/react-query';
import { get, endpoints } from '@/lib/api';

export interface ProcurementDashboardData {
  openPOs: { count: number; value: number };
  pendingMRs: number;
  pendingApprovals: number;
  topSuppliers: Array<{ name: string; totalValue: number }>;
  recentGRNs: Array<{
    receiptNumber: string;
    supplier: string;
    receiptDate: string;
    status: string;
  }>;
}

const procurementKeys = {
  all: ['procurement-dashboard'] as const,
};

export function useProcurementDashboard() {
  return useQuery({
    queryKey: procurementKeys.all,
    queryFn: () => get<ProcurementDashboardData>(endpoints.dashboard.procurement),
  });
}
