'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useDeliveryNotes, type DeliveryNote } from '@/hooks/use-selling';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<DeliveryNote['status'], 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  dispatched: 'info',
  delivered: 'success',
  returned: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Dispatched', value: 'dispatched' },
      { label: 'Delivered', value: 'delivered' },
      { label: 'Returned', value: 'returned' },
    ],
  },
];

const columns: ColumnDef<DeliveryNote, unknown>[] = [
  {
    accessorKey: 'deliveryNumber',
    header: ({ column }) => <SortableHeader column={column}>Delivery #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/selling/delivery-notes/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.deliveryNumber}
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
    accessorKey: 'salesOrder',
    header: 'Sales Order',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.salesOrder ?? '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'deliveryDate',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.deliveryDate)}</span>,
  },
  {
    accessorKey: 'carrier',
    header: 'Carrier',
    cell: ({ row }) => <span className="text-sm">{row.original.carrier || '\u2014'}</span>,
  },
  {
    accessorKey: 'trackingNumber',
    header: 'Tracking #',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">{row.original.trackingNumber || '\u2014'}</span>
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

export default function DeliveryNotesPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const statusFilter = filterValues.status as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
  };

  const { data, isLoading } = useDeliveryNotes(apiFilters);
  const notes = data ?? [];

  const totalCount = notes.length;
  const dispatched = notes.filter((n) => n.status === 'dispatched').length;
  const delivered = notes.filter((n) => n.status === 'delivered').length;
  const returned = notes.filter((n) => n.status === 'returned').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: DeliveryNote) => {
      router.push(`/selling/delivery-notes/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Delivery Notes"
      subtitle="Track shipments and deliveries"
      breadcrumbs={[
        { label: 'Selling', href: '/selling' },
        { label: 'Delivery Notes' },
      ]}
      createButton={{ label: 'New Delivery Note', href: '/selling/delivery-notes/new' }}
      summaryCards={[
        { label: 'Total', value: totalCount },
        { label: 'Dispatched', value: dispatched, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Delivered', value: delivered, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Returned', value: returned, icon: <span className="text-red-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={notes}
        isLoading={isLoading}
        searchPlaceholder="Search delivery notes..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No delivery notes found."
        emptyAction={{
          label: 'Create Delivery Note',
          onClick: () => router.push('/selling/delivery-notes/new'),
        }}
      />
    </ListPage>
  );
}
