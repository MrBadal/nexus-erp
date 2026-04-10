'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, endpoints, buildQueryString } from '@/lib/api';

export interface BillLine {
  id: string;
  lineNumber: number;
  itemId: string | null;
  purchaseOrderLineId: string | null;
  description: string | null;
  quantity: string;
  unitPrice: string;
  discountType: string | null;
  discountValue: string;
  taxAmount: string;
  lineTotal: string;
  accountId: string | null;
  hsnCode: string | null;
  cgstRate: string | null;
  sgstRate: string | null;
  igstRate: string | null;
  cgstAmount: string | null;
  sgstAmount: string | null;
  igstAmount: string | null;
  rcmApplicable: boolean;
  itcEligible: boolean;
  itcBlockReason: string | null;
}

export interface Bill {
  id: string;
  tenantId: string;
  billNumber: string;
  vendorId: string | null;
  vendorInvoiceNumber: string | null;
  status: 'draft' | 'received' | 'approved' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'void';
  purchaseOrderId: string | null;
  issueDate: string;
  receivedDate: string | null;
  dueDate: string;
  paymentTerms: string | null;
  currencyCode: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  threeWayMatchStatus: string | null;
  tdsSectionId: string | null;
  tdsRate: string | null;
  tdsAmount: string;
  rcmApplicable: boolean;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: BillLine[];
}

export interface BillFilters {
  status?: string;
  vendorId?: string;
  purchaseOrderId?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined | null;
}

export const billKeys = {
  all: ['bills'] as const,
  lists: () => [...billKeys.all, 'list'] as const,
  list: (filters?: BillFilters) => [...billKeys.lists(), filters] as const,
  details: () => [...billKeys.all, 'detail'] as const,
  detail: (id: string) => [...billKeys.details(), id] as const,
};

export function useBills(filters?: BillFilters) {
  return useQuery({
    queryKey: billKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<Bill[]>(`${endpoints.bills.list}${qs}`);
    },
    staleTime: 30_000,
  });
}

export function useBill(id: string) {
  return useQuery({
    queryKey: billKeys.detail(id),
    queryFn: async () => {
      return get<Bill>(endpoints.bills.get(id));
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return post<Bill>(endpoints.bills.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
    },
  });
}

export function useApproveBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<Bill>(endpoints.bills.approve(id));
    },
    onSuccess: (_: Bill, id: string) => {
      queryClient.invalidateQueries({ queryKey: billKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
    },
  });
}

export function useVoidBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<Bill>(endpoints.bills.void(id));
    },
    onSuccess: (_: Bill, id: string) => {
      queryClient.invalidateQueries({ queryKey: billKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
    },
  });
}
