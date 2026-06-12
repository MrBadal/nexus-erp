'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { useWarehouses, type Warehouse } from '@/hooks/use-inventory';
import { formatCurrency } from '@/lib/utils';

const columns: ColumnDef<Warehouse, unknown>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => <SortableHeader column={column}>Code</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/inventory/warehouses/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'city',
    header: 'City',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.city}</span>,
  },
  {
    accessorKey: 'itemCount',
    header: ({ column }) => <SortableHeader column={column}>Items</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{row.original.itemCount}</span>,
  },
  {
    accessorKey: 'totalValue',
    header: ({ column }) => <SortableHeader column={column}>Total Value</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(row.original.totalValue)}</span>
    ),
  },
  {
    accessorKey: 'isDefault',
    header: 'Default',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.isDefault ? 'Yes' : '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Active',
    cell: ({ row }) => (
      <StatusDot
        status={row.original.isActive ? 'success' : 'muted'}
        label={row.original.isActive ? 'Active' : 'Inactive'}
      />
    ),
  },
];

export default function WarehousesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useWarehouses();
  const warehouses = data ?? [];

  const total = warehouses.length;
  const active = warehouses.filter((w) => w.isActive).length;
  const totalItems = warehouses.reduce((sum, w) => sum + (w.itemCount || 0), 0);
  const totalValue = warehouses.reduce((sum, w) => sum + (w.totalValue || 0), 0);

  const handleRowClick = useCallback(
    (row: Warehouse) => {
      router.push(`/inventory/warehouses/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Warehouses"
      subtitle="Manage your storage locations and distribution centers"
      breadcrumbs={[
        { label: 'Inventory', href: '/inventory' },
        { label: 'Warehouses' },
      ]}
      createButton={{ label: 'New Warehouse', href: '/inventory/warehouses/new' }}
      summaryCards={[
        { label: 'Total Warehouses', value: total },
        { label: 'Active', value: active, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Total Items', value: totalItems },
        { label: 'Total Value', value: formatCurrency(totalValue) },
      ]}
    >
      <DataTable
        columns={columns}
        data={warehouses}
        isLoading={isLoading}
        searchPlaceholder="Search warehouses..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No warehouses found."
        emptyAction={{
          label: 'Add Warehouse',
          onClick: () => router.push('/inventory/warehouses/new'),
        }}
      />
    </ListPage>
  );
}
