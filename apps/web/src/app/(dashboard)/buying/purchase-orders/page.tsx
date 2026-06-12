'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { usePurchaseOrders, type PurchaseOrder } from '@/hooks/use-buying';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<PurchaseOrder['status'], 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  submitted: 'info',
  approved: 'success',
  received: 'success',
  partially_received: 'warning',
  cancelled: 'danger',
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
      { label: 'Received', value: 'received' },
      { label: 'Partially Received', value: 'partially_received' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
];

const columns: ColumnDef<PurchaseOrder, unknown>[] = [
  {
    accessorKey: 'orderNumber',
    header: ({ column }) => <SortableHeader column={column}>PO #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/buying/purchase-orders/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.orderNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'supplier',
    header: ({ column }) => <SortableHeader column={column}>Supplier</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{row.original.supplier}</span>,
  },
  {
    accessorKey: 'orderDate',
    header: ({ column }) => <SortableHeader column={column}>Order Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.orderDate)}</span>,
  },
  {
    accessorKey: 'expectedDelivery',
    header: 'Expected Delivery',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.expectedDelivery ? formatDate(row.original.expectedDelivery) : '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => <SortableHeader column={column}>Total</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(row.original.totalAmount)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status;
      const label = s === 'partially_received' ? 'Partial' : s.charAt(0).toUpperCase() + s.slice(1);
      return <StatusDot status={statusVariant[s]} label={label} />;
    },
  },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const statusFilter = filterValues.status as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
  };

  const { data, isLoading } = usePurchaseOrders(apiFilters);
  const orders = data ?? [];

  const totalCount = orders.length;
  const approved = orders.filter((o) => o.status === 'approved').length;
  const draft = orders.filter((o) => o.status === 'draft').length;
  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: PurchaseOrder) => {
      router.push(`/buying/purchase-orders/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Purchase Orders"
      subtitle="Manage procurement orders"
      breadcrumbs={[
        { label: 'Buying', href: '/buying' },
        { label: 'Purchase Orders' },
      ]}
      createButton={{ label: 'New Purchase Order', href: '/buying/purchase-orders/new' }}
      summaryCards={[
        { label: 'Total POs', value: totalCount },
        { label: 'Approved', value: approved, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Draft', value: draft, icon: <span className="text-amber-500">&#9679;</span> },
        { label: 'Total Value', value: formatCurrency(totalValue) },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        searchPlaceholder="Search purchase orders..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No purchase orders found."
        emptyAction={{
          label: 'Create PO',
          onClick: () => router.push('/buying/purchase-orders/new'),
        }}
      />
    </ListPage>
  );
}
