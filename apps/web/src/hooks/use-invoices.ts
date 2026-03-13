'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints, buildQueryString } from '@/lib/api';
import { accountKeys } from './use-accounts';

export interface InvoiceLine {
  id: string;
  lineNumber: number;
  description: string | null;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  amount: string;
  accountId: string | null;
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  type: string;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'void';
  customerId: string | null;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  currencyCode: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines?: InvoiceLine[];
}

export interface InvoiceFilters {
  status?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined | null;
}

export interface RecordPaymentData {
  amount: string;
  date: string;
  reference?: string;
  paymentMethod?: string;
}

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters?: InvoiceFilters) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<Invoice[]>(`${endpoints.invoices.list}${qs}`);
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: async () => {
      return get<Invoice>(endpoints.invoices.get(id));
    },
    enabled: !!id,
  });
}

export interface CreateInvoiceData {
  type: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  currencyCode: string;
  notes?: string;
  lines: Omit<InvoiceLine, 'id' | 'accountId'>[];
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateInvoiceData) => {
      return post<Invoice>(endpoints.invoices.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Invoice> }) => {
      return put<Invoice>(endpoints.invoices.update(id), data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useConfirmInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<Invoice>(endpoints.invoices.confirm(id));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<Invoice>(endpoints.invoices.send(id));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RecordPaymentData }) => {
      return post<Invoice>(endpoints.invoices.payment(id), data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return post<Invoice>(endpoints.invoices.void(id));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await del(endpoints.invoices.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}
