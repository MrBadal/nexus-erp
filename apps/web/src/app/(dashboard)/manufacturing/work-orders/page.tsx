'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useWorkOrders } from '@/hooks/use-manufacturing';
import { formatDate } from '@/lib/utils';

interface WorkOrder {
  id: string;
  workOrderNumber?: string;
  number?: string;
  itemName?: string;
  item?: string;
  quantity?: number;
  completedQty?: number;
  completed?: number;
  uom?: string;
  plannedStartDate?: string;
  plannedEndDate?: string | null;
  status?: 'draft' | 'not_started' | 'in_progress' | 'completed' | 'stopped' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

const statusVariant: Record<string, 'muted' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'muted',
  not_started: 'info',
  in_progress: 'warning',
  completed: 'success',
  stopped: 'danger',
  cancelled: 'danger',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  stopped: 'Stopped',
  cancelled: 'Cancelled',
};

const priorityVariant: Record<string, 'muted' | 'info' | 'warning' | 'danger'> = {
  low: 'muted',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Not Started', value: 'not_started' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Completed', value: 'completed' },
      { label: 'Stopped', value: 'stopped' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'checkbox-group',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
      { label: 'Urgent', value: 'urgent' },
    ],
  },
];

export default function WorkOrdersPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useWorkOrders();
  const workOrders = (data ?? []) as WorkOrder[];

  const total = workOrders.length;
  const draft = workOrders.filter((wo) => wo.status === 'draft').length;
  const inProgress = workOrders.filter((wo) => wo.status === 'in_progress').length;
  const completed = workOrders.filter((wo) => wo.status === 'completed').length;

  const columns: ColumnDef<WorkOrder, unknown>[] = [
    {
      accessorKey: 'workOrderNumber',
      header: ({ column }) => <SortableHeader column={column}>Work Order #</SortableHeader>,
      cell: ({ row }) => (
        <Link
          href={`/manufacturing/work-orders/${row.original.id}`}
          className="font-mono text-sm font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.workOrderNumber || row.original.number || '\u2014'}
        </Link>
      ),
    },
    {
      accessorKey: 'itemName',
      header: ({ column }) => <SortableHeader column={column}>Item</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.itemName || row.original.item || '\u2014'}</span>
      ),
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const qty = row.original.quantity || 0;
        const done = row.original.completedQty ?? row.original.completed ?? 0;
        const pct = qty > 0 ? Math.round((done / qty) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full overflow-hidden bg-gray-200">
              <div
                className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-300'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-xs text-muted-foreground">{done}/{qty}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'plannedStartDate',
      header: ({ column }) => <SortableHeader column={column}>Start Date</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.plannedStartDate ? formatDate(row.original.plannedStartDate) : '\u2014'}
        </span>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const p = row.original.priority || 'medium';
        return (
          <StatusDot
            status={priorityVariant[p] || 'muted'}
            label={p.charAt(0).toUpperCase() + p.slice(1)}
          />
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status || 'draft';
        return (
          <StatusDot
            status={statusVariant[s] || 'muted'}
            label={statusLabels[s] || s}
          />
        );
      },
    },
  ];

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: WorkOrder) => {
      router.push(`/manufacturing/work-orders/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Work Orders"
      subtitle="Track and manage production work orders"
      breadcrumbs={[
        { label: 'Manufacturing', href: '/manufacturing' },
        { label: 'Work Orders' },
      ]}
      createButton={{ label: 'New Work Order', href: '/manufacturing/work-orders/new' }}
      summaryCards={[
        { label: 'Total Orders', value: total },
        { label: 'Draft', value: draft, icon: <span className="text-gray-500">&#9679;</span> },
        { label: 'In Progress', value: inProgress, icon: <span className="text-amber-500">&#9679;</span> },
        { label: 'Completed', value: completed, icon: <span className="text-emerald-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={workOrders}
        isLoading={isLoading}
        searchPlaceholder="Search work orders..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No work orders found."
        emptyAction={{
          label: 'Create Work Order',
          onClick: () => router.push('/manufacturing/work-orders/new'),
        }}
      />
    </ListPage>
  );
}
