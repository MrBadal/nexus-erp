'use client';

import { useState, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useQuery } from '@tanstack/react-query';
import { get, endpoints } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  warehouseId: string;
  reason: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  notes: string | null;
  createdAt: string;
  warehouse?: { name: string };
  lines?: { id: string }[];
}

const statusVariant: Record<string, 'default' | 'info' | 'success' | 'danger'> = {
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Submitted', value: 'submitted' },
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' },
    ],
  },
];

const columns: ColumnDef<StockAdjustment, unknown>[] = [
  {
    accessorKey: 'adjustmentNumber',
    header: ({ column }) => <SortableHeader column={column}>Adjustment #</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{row.original.adjustmentNumber}</span>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => <span className="text-sm">{row.original.reason}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status;
      return (
        <StatusDot
          status={statusVariant[s] ?? 'default'}
          label={s.charAt(0).toUpperCase() + s.slice(1)}
        />
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span>,
  },
];

export default function StockReconciliationPage() {
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: () => get<StockAdjustment[]>(endpoints.stockMovements.adjust),
  });

  const adjustments = data ?? [];

  const drafts = adjustments.filter((a) => a.status === 'draft').length;
  const submitted = adjustments.filter((a) => a.status === 'submitted').length;
  const approved = adjustments.filter((a) => a.status === 'approved').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  return (
    <ListPage
      title="Stock Reconciliation"
      subtitle="Compare physical stock counts against system quantities and create adjustments"
      breadcrumbs={[
        { label: 'Inventory', href: '/inventory' },
        { label: 'Stock Reconciliation' },
      ]}
      summaryCards={[
        { label: 'Total Reconciliations', value: adjustments.length },
        { label: 'Drafts', value: drafts },
        { label: 'Pending Approval', value: submitted },
        { label: 'Approved', value: approved },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
      createButton={{ label: 'New Reconciliation', href: '/inventory/reconciliation/new' }}
    >
      <DataTable
        columns={columns}
        data={adjustments}
        isLoading={isLoading}
        searchPlaceholder="Search reconciliations..."
        searchValue={search}
        onSearchChange={setSearch}
        emptyMessage="No stock reconciliations found. Create your first reconciliation to compare physical counts with system quantities."
      />
    </ListPage>
  );
}
