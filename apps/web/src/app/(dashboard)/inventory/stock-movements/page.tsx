'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useStockMovements, type StockMovement } from '@/hooks/use-inventory';
import { formatCurrency, formatDate } from '@/lib/utils';

const typeVariant: Record<StockMovement['type'], 'success' | 'danger' | 'info' | 'warning'> = {
  receipt: 'success',
  issue: 'danger',
  transfer: 'info',
  adjustment: 'warning',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'type',
    label: 'Type',
    type: 'checkbox-group',
    options: [
      { label: 'Receipt', value: 'receipt' },
      { label: 'Issue', value: 'issue' },
      { label: 'Transfer', value: 'transfer' },
      { label: 'Adjustment', value: 'adjustment' },
    ],
  },
];

const columns: ColumnDef<StockMovement, unknown>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.date)}</span>,
  },
  {
    accessorKey: 'item',
    header: 'Item',
    cell: ({ row }) => (
      <div>
        <span className="text-sm font-medium">{row.original.item}</span>
        <span className="ml-2 font-mono text-xs text-muted-foreground">{row.original.itemCode}</span>
      </div>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const t = row.original.type;
      return (
        <StatusDot
          status={typeVariant[t]}
          label={t.charAt(0).toUpperCase() + t.slice(1)}
        />
      );
    },
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => <SortableHeader column={column}>Qty</SortableHeader>,
    cell: ({ row }) => {
      const q = row.original.quantity;
      return (
        <span className={`font-mono text-sm ${q > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {q > 0 ? `+${q}` : q}
        </span>
      );
    },
  },
  {
    accessorKey: 'unitCost',
    header: 'Unit Cost',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(row.original.unitCost)}</span>
    ),
  },
  {
    accessorKey: 'warehouse',
    header: 'Warehouse',
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.warehouse}
        {row.original.toWarehouse && <span className="text-xs text-muted-foreground"> → {row.original.toWarehouse}</span>}
      </span>
    ),
  },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">{row.original.reference}</span>
    ),
  },
];

export default function StockMovementsPage() {
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useStockMovements();
  const movements = data ?? [];

  const totalCount = movements.length;
  const receipts = movements.filter((m) => m.type === 'receipt').length;
  const issues = movements.filter((m) => m.type === 'issue').length;
  const transfers = movements.filter((m) => m.type === 'transfer').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  return (
    <ListPage
      title="Stock Movements"
      subtitle="Track all inventory receipts, issues, transfers, and adjustments"
      breadcrumbs={[
        { label: 'Inventory', href: '/inventory' },
        { label: 'Stock Movements' },
      ]}
      summaryCards={[
        { label: 'Total Movements', value: totalCount },
        { label: 'Receipts', value: receipts, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Issues', value: issues, icon: <span className="text-red-600">&#9679;</span> },
        { label: 'Transfers', value: transfers, icon: <span className="text-blue-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={movements}
        isLoading={isLoading}
        searchPlaceholder="Search movements..."
        searchValue={search}
        onSearchChange={setSearch}
        emptyMessage="No stock movements found."
      />
    </ListPage>
  );
}
