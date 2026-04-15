'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useSalesOrders, type SalesOrder } from '@/hooks/use-selling';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<SalesOrder['status'], 'warning' | 'info' | 'success' | 'default' | 'danger'> = {
  draft: 'warning',
  confirmed: 'info',
  delivered: 'success',
  invoiced: 'default',
  cancelled: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Confirmed', value: 'confirmed' },
      { label: 'Delivered', value: 'delivered' },
      { label: 'Invoiced', value: 'invoiced' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
];

const columns: ColumnDef<SalesOrder, unknown>[] = [
  {
    accessorKey: 'orderNumber',
    header: ({ column }) => <SortableHeader column={column}>Order #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/selling/sales-orders/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.orderNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'customerName',
    header: ({ column }) => <SortableHeader column={column}>Customer</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm">{row.original.customerName ?? row.original.customer ?? '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'orderDate',
    header: ({ column }) => <SortableHeader column={column}>Order Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.orderDate)}</span>,
  },
  {
    accessorKey: 'deliveryDate',
    header: 'Delivery Date',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.deliveryDate ? formatDate(row.original.deliveryDate) : '\u2014'}</span>
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
      return (
        <StatusDot
          status={statusVariant[s]}
          label={s.charAt(0).toUpperCase() + s.slice(1)}
        />
      );
    },
  },
];

export default function SalesOrdersPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const statusFilter = filterValues.status as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
  };

  const { data, isLoading } = useSalesOrders(apiFilters);
  const orders = data ?? [];

  const totalCount = orders.length;
  const confirmed = orders.filter((o) => o.status === 'confirmed').length;
  const draft = orders.filter((o) => o.status === 'draft').length;
  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: SalesOrder) => {
      router.push(`/selling/sales-orders/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Sales Orders"
      subtitle="Track and manage customer orders"
      breadcrumbs={[
        { label: 'Selling', href: '/selling' },
        { label: 'Sales Orders' },
      ]}
      createButton={{ label: 'New Sales Order', href: '/selling/sales-orders/new' }}
      summaryCards={[
        { label: 'Total Orders', value: totalCount },
        { label: 'Confirmed', value: confirmed, icon: <span className="text-blue-600">&#9679;</span> },
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
        searchPlaceholder="Search sales orders..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No sales orders found."
        emptyAction={{
          label: 'Create Order',
          onClick: () => router.push('/selling/sales-orders/new'),
        }}
      />
    </ListPage>
  );
}
