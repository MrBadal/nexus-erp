'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { Star } from 'lucide-react';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useSuppliers, type Supplier } from '@/hooks/use-buying';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`h-3 w-3 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

const statusVariant: Record<string, 'success' | 'muted'> = {
  active: 'success',
  inactive: 'muted',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
];

const columns: ColumnDef<Supplier, unknown>[] = [
  {
    accessorKey: 'supplierNumber',
    header: ({ column }) => <SortableHeader column={column}>Supplier #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/buying/suppliers/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.supplierNumber ?? row.original.id.slice(0, 8)}
      </Link>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.phone}</span>,
  },
  {
    accessorKey: 'rating',
    header: ({ column }) => <SortableHeader column={column}>Rating</SortableHeader>,
    cell: ({ row }) => <StarRating rating={row.original.rating} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusDot
        status={statusVariant[row.original.status] ?? 'muted'}
        label={row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      />
    ),
  },
];

export default function SuppliersPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useSuppliers();
  const suppliers = data ?? [];

  const total = suppliers.length;
  const active = suppliers.filter((s) => s.status === 'active').length;
  const inactive = suppliers.filter((s) => s.status === 'inactive').length;
  const avgRating = suppliers.length > 0
    ? (suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length).toFixed(1)
    : '0';

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Supplier) => {
      router.push(`/buying/suppliers/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Suppliers"
      subtitle="Manage your supplier relationships"
      breadcrumbs={[
        { label: 'Buying', href: '/buying' },
        { label: 'Suppliers' },
      ]}
      createButton={{ label: 'New Supplier', href: '/buying/suppliers/new' }}
      summaryCards={[
        { label: 'Total Suppliers', value: total },
        { label: 'Active', value: active, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Inactive', value: inactive, icon: <span className="text-muted-foreground">&#9679;</span> },
        { label: 'Avg Rating', value: avgRating, icon: <span className="text-amber-500">&#9733;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
        searchPlaceholder="Search suppliers..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No suppliers found."
        emptyAction={{
          label: 'Add Supplier',
          onClick: () => router.push('/buying/suppliers/new'),
        }}
      />
    </ListPage>
  );
}
