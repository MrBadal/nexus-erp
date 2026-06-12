'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints, buildQueryString } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  tenantId: string;
  customerNumber: string;
  name: string;
  customerType: 'company' | 'individual';
  email: string;
  phone: string;
  company?: string | null;
  taxId?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingCountry?: string | null;
  billingPostalCode?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingCountry?: string | null;
  shippingPostalCode?: string | null;
  creditLimit?: number | null;
  currency?: string | null;
  paymentTerms?: string | null;
  outstandingBalance: number;
  status: 'active' | 'inactive' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrderLine {
  id?: string;
  itemId: string;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

export interface SalesOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  customerId: string;
  customer?: string;
  customerName?: string;
  orderDate: string;
  deliveryDate: string | null;
  status: 'draft' | 'confirmed' | 'delivered' | 'invoiced' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string | null;
  lines?: SalesOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  tenantId: string;
  quotationNumber: string;
  customerId: string;
  customer?: string;
  customerName?: string;
  quotationDate: string;
  validUntil: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string | null;
  lines?: SalesOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryNote {
  id: string;
  tenantId: string;
  deliveryNumber: string;
  salesOrderId: string;
  salesOrder?: string;
  customerId: string;
  customer?: string;
  customerName?: string;
  deliveryDate: string;
  carrier: string;
  trackingNumber: string;
  status: 'draft' | 'dispatched' | 'delivered' | 'returned';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellingListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined | null;
}

// ─── Query Keys ─────────────────────────────────────────────────────

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters?: SellingListFilters) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

export const salesOrderKeys = {
  all: ['salesOrders'] as const,
  lists: () => [...salesOrderKeys.all, 'list'] as const,
  list: (filters?: SellingListFilters) => [...salesOrderKeys.lists(), filters] as const,
  details: () => [...salesOrderKeys.all, 'detail'] as const,
  detail: (id: string) => [...salesOrderKeys.details(), id] as const,
};

export const quotationKeys = {
  all: ['quotations'] as const,
  lists: () => [...quotationKeys.all, 'list'] as const,
  list: (filters?: SellingListFilters) => [...quotationKeys.lists(), filters] as const,
  details: () => [...quotationKeys.all, 'detail'] as const,
  detail: (id: string) => [...quotationKeys.details(), id] as const,
};

export const deliveryNoteKeys = {
  all: ['deliveryNotes'] as const,
  lists: () => [...deliveryNoteKeys.all, 'list'] as const,
  list: (filters?: SellingListFilters) => [...deliveryNoteKeys.lists(), filters] as const,
  details: () => [...deliveryNoteKeys.all, 'detail'] as const,
  detail: (id: string) => [...deliveryNoteKeys.details(), id] as const,
};

// ─── Customers ──────────────────────────────────────────────────────

export function useCustomers(filters?: SellingListFilters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<Customer[]>(`${endpoints.customers.list}${qs}`);
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => get<Customer>(endpoints.customers.get(id)),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Customer> | Record<string, unknown>) =>
      post<Customer>(endpoints.customers.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      put<Customer>(endpoints.customers.update(id), data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(endpoints.customers.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

// ─── Sales Orders ───────────────────────────────────────────────────

export function useSalesOrders(filters?: SellingListFilters) {
  return useQuery({
    queryKey: salesOrderKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<SalesOrder[]>(`${endpoints.salesOrders.list}${qs}`);
    },
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: salesOrderKeys.detail(id),
    queryFn: () => get<SalesOrder>(endpoints.salesOrders.get(id)),
    enabled: !!id,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post<SalesOrder>(endpoints.salesOrders.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SalesOrder> | Record<string, unknown> }) =>
      put<SalesOrder>(endpoints.salesOrders.update(id), data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
    },
  });
}

export function useDeleteSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(endpoints.salesOrders.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
    },
  });
}

export function useConfirmSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<SalesOrder>(endpoints.salesOrders.confirm(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
    },
  });
}

export function useCancelSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<SalesOrder>(endpoints.salesOrders.cancel(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
    },
  });
}

// ─── Quotations ─────────────────────────────────────────────────────

export function useQuotations(filters?: SellingListFilters) {
  return useQuery({
    queryKey: quotationKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<Quotation[]>(`${endpoints.quotations.list}${qs}`);
    },
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: quotationKeys.detail(id),
    queryFn: () => get<Quotation>(endpoints.quotations.get(id)),
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post<Quotation>(endpoints.quotations.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Quotation> | Record<string, unknown> }) =>
      put<Quotation>(endpoints.quotations.update(id), data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(endpoints.quotations.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}

export function useSendQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<Quotation>(endpoints.quotations.send(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}

export function useAcceptQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<Quotation>(endpoints.quotations.accept(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}

export function useRejectQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<Quotation>(endpoints.quotations.reject(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}

export function useConvertQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<SalesOrder>(endpoints.quotations.convertToSo(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.lists() });
    },
  });
}

// ─── Delivery Notes ─────────────────────────────────────────────────

export function useDeliveryNotes(filters?: SellingListFilters) {
  return useQuery({
    queryKey: deliveryNoteKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<DeliveryNote[]>(`${endpoints.deliveryNotes.list}${qs}`);
    },
  });
}

export function useDeliveryNote(id: string) {
  return useQuery({
    queryKey: deliveryNoteKeys.detail(id),
    queryFn: () => get<DeliveryNote>(endpoints.deliveryNotes.get(id)),
    enabled: !!id,
  });
}

export function useUpdateDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DeliveryNote> | Record<string, unknown> }) =>
      put<DeliveryNote>(endpoints.deliveryNotes.update(id), data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: deliveryNoteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deliveryNoteKeys.lists() });
    },
  });
}

export function useCreateDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post<DeliveryNote>(endpoints.deliveryNotes.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryNoteKeys.lists() });
    },
  });
}

export function useDispatchDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<DeliveryNote>(endpoints.deliveryNotes.dispatch(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: deliveryNoteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deliveryNoteKeys.lists() });
    },
  });
}

export function useDeliverDeliveryNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<DeliveryNote>(endpoints.deliveryNotes.deliver(id)),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: deliveryNoteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deliveryNoteKeys.lists() });
    },
  });
}
