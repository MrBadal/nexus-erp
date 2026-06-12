'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints, buildQueryString } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Item {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: string;
  itemType: 'stock' | 'service' | 'consumable';
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
  taxRate: number;
  stockQty: number;
  minStockLevel: number;
  reorderQuantity: number;
  description: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  itemCount: number;
  totalValue: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  date: string;
  item: string;
  itemCode: string;
  type: 'receipt' | 'issue' | 'transfer' | 'adjustment';
  quantity: number;
  unitCost: number;
  warehouse: string;
  toWarehouse?: string;
  reference: string;
  createdBy: string;
  createdAt: string;
}

export interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined | null;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};

export const warehouseKeys = {
  all: ['warehouses'] as const,
  lists: () => [...warehouseKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...warehouseKeys.lists(), filters] as const,
  details: () => [...warehouseKeys.all, 'detail'] as const,
  detail: (id: string) => [...warehouseKeys.details(), id] as const,
};

export const stockMovementKeys = {
  all: ['stockMovements'] as const,
  lists: () => [...stockMovementKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...stockMovementKeys.lists(), filters] as const,
};

// ─── Item Hooks ──────────────────────────────────────────────────────────────

export function useItems(filters?: ListFilters) {
  return useQuery({
    queryKey: itemKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<Item[]>(`${endpoints.items.list}${qs}`);
    },
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: async () => {
      return get<Item>(endpoints.items.get(id));
    },
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Item> | Record<string, unknown>) => {
      return post<Item>(endpoints.items.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Item> | Record<string, unknown> }) => {
      return put<Item>(endpoints.items.update(id), data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await del(endpoints.items.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

// ─── Warehouse Hooks ─────────────────────────────────────────────────────────

export function useWarehouses(filters?: ListFilters) {
  return useQuery({
    queryKey: warehouseKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<Warehouse[]>(`${endpoints.warehouses.list}${qs}`);
    },
  });
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: warehouseKeys.detail(id),
    queryFn: async () => {
      return get<Warehouse>(endpoints.warehouses.get(id));
    },
    enabled: !!id,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Warehouse> | Record<string, unknown>) => {
      return post<Warehouse>(endpoints.warehouses.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Warehouse> | Record<string, unknown> }) => {
      return put<Warehouse>(endpoints.warehouses.update(id), data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await del(endpoints.warehouses.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    },
  });
}

// ─── Stock Movement Hooks ────────────────────────────────────────────────────

export function useStockMovements(filters?: ListFilters) {
  return useQuery({
    queryKey: stockMovementKeys.list(filters),
    queryFn: async () => {
      const qs = filters ? buildQueryString(filters) : '';
      return get<StockMovement[]>(`${endpoints.stockMovements.list}${qs}`);
    },
  });
}

// ─── Valuation Types & Hooks ────────────────────────────────────────────────

export interface ValuationLine {
  itemId: string;
  itemName: string;
  itemCode: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  valuationRate: number;
  totalValue: number;
}

export interface ValuationReport {
  lines: ValuationLine[];
  totalValue: number;
}

export const valuationKeys = {
  all: ['valuation'] as const,
  report: (warehouseId?: string) => [...valuationKeys.all, 'report', warehouseId] as const,
};

export function useValuationReport(warehouseId?: string) {
  return useQuery({
    queryKey: valuationKeys.report(warehouseId),
    queryFn: async () => {
      const params = warehouseId ? `?warehouseId=${warehouseId}` : '';
      return get<ValuationReport>(`${endpoints.valuation.report}${params}`);
    },
  });
}

// ─── Reorder Types & Hooks ──────────────────────────────────────────────────

export interface ReorderItem {
  itemId: string;
  itemName: string;
  itemCode: string;
  warehouseId: string;
  warehouseName: string;
  currentQty: number;
  minStockLevel: number;
  reorderQuantity: number;
  defaultSupplierId: string | null;
  purchasePrice: number;
}

export interface ReorderResult {
  itemsChecked: number;
  itemsBelowMin: number;
  purchaseOrdersCreated: number;
  purchaseOrderIds: string[];
  skippedNoSupplier: string[];
}

export const reorderKeys = {
  all: ['reorder'] as const,
  check: () => [...reorderKeys.all, 'check'] as const,
};

export function useCheckReorderLevels() {
  return useQuery({
    queryKey: reorderKeys.check(),
    queryFn: async () => {
      return get<ReorderItem[]>(endpoints.reorder.check);
    },
    enabled: false, // manual trigger only
  });
}

export function useGenerateReorderPOs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return post<ReorderResult>(endpoints.reorder.check);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reorderKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}
