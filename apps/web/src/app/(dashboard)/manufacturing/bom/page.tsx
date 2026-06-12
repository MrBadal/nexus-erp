'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useBoms } from '@/hooks/use-manufacturing';

interface Bom {
  id: string;
  bomNumber?: string;
  itemName?: string;
  item?: string;
  quantity?: number;
  uom?: string;
  itemCount?: number;
  isDefault?: boolean;
  status?: 'draft' | 'active' | 'inactive';
}

const statusVariant: Record<string, 'muted' | 'success' | 'danger'> = {
  draft: 'muted',
  active: 'success',
  inactive: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
];

const columns: ColumnDef<Bom, unknown>[] = [
  {
    accessorKey: 'bomNumber',
    header: ({ column }) => <SortableHeader column={column}>BOM #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/manufacturing/bom/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.bomNumber || '\u2014'}
      </Link>
    ),
  },
  {
    accessorKey: 'itemName',
    header: ({ column }) => <SortableHeader column={column}>Finished Good</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.original.itemName || row.original.item || '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.quantity ?? 0}</span>,
  },
  {
    accessorKey: 'uom',
    header: 'UOM',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.uom || '\u2014'}</span>,
  },
  {
    accessorKey: 'itemCount',
    header: ({ column }) => <SortableHeader column={column}>Components</SortableHeader>,
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.itemCount ?? 0}</span>,
  },
  {
    accessorKey: 'isDefault',
    header: 'Default',
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.isDefault ? (
          <StatusDot status="info" label="Default" />
        ) : (
          <span className="text-muted-foreground">\u2014</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status || 'draft';
      return (
        <StatusDot
          status={statusVariant[s] || 'muted'}
          label={s.charAt(0).toUpperCase() + s.slice(1)}
        />
      );
    },
  },
];

export default function BomListPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useBoms();
  const boms = (data ?? []) as Bom[];

  const total = boms.length;
  const active = boms.filter((b) => b.status === 'active').length;
  const draft = boms.filter((b) => b.status === 'draft').length;
  const inactive = boms.filter((b) => b.status === 'inactive').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Bom) => {
      router.push(`/manufacturing/bom/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Bill of Materials"
      subtitle="Manage product recipes and component lists"
      breadcrumbs={[
        { label: 'Manufacturing', href: '/manufacturing' },
        { label: 'Bill of Materials' },
      ]}
      createButton={{ label: 'New BOM', href: '/manufacturing/bom/new' }}
      summaryCards={[
        { label: 'Total BOMs', value: total },
        { label: 'Active', value: active, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Draft', value: draft, icon: <span className="text-gray-500">&#9679;</span> },
        { label: 'Inactive', value: inactive, icon: <span className="text-red-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={boms}
        isLoading={isLoading}
        searchPlaceholder="Search BOMs..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No bills of materials found."
        emptyAction={{
          label: 'Create BOM',
          onClick: () => router.push('/manufacturing/bom/new'),
        }}
      />
    </ListPage>
  );
}
