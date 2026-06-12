'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints, buildQueryString } from '@/lib/api';

export interface Payment {
  id: string;
  paymentNumber: string;
  type: 'received' | 'made';
  status: 'draft' | 'confirmed' | 'completed' | 'void' | 'pending';
  paymentDate: string;
  amount: string;
  paymentMethod: string | null;
  reference: string | null;
  partyName: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  billId: string | null;
  billNumber: string | null;
  currencyCode: string;
  notes: string | null;
  createdAt: string;
}

export interface PaymentFilters {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined | null;
}

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters?: PaymentFilters) => [...paymentKeys.lists(), filters] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
};

export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<Payment[]>(`${endpoints.payments.list}${qs}`);
    },
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: async () => get<Payment>(endpoints.payments.get(id)),
    enabled: !!id,
  });
}

export interface CreatePaymentData {
  type: 'received' | 'made';
  paymentDate: string;
  amount: string;
  paymentMethod?: string;
  reference?: string;
  partyName?: string;
  invoiceId?: string;
  billId?: string;
  notes?: string;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePaymentData) => {
      return post<Payment>(endpoints.payments.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<Payment>(endpoints.payments.confirm(id));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}

export function useVoidPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<Payment>(endpoints.payments.void(id));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}
