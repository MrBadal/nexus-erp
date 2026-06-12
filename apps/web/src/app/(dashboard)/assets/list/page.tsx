'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useAssets } from '@/hooks/use-assets';
import { formatCurrency } from '@/lib/utils';

interface Asset {
  id: string;
  assetNumber?: string;
  name?: string;
  category?: string;
  status?: 'draft' | 'submitted' | 'in_use' | 'maintenance' | 'disposed' | 'scrapped';
  location?: string;
  department?: string;
  purchaseAmount?: number;
  currentValue?: number;
  depreciationMethod?: string;
  usefulLife?: number;
}

const statusVariant: Record<string, 'muted' | 'warning' | 'success' | 'danger'> = {
  draft: 'muted',
  submitted: 'warning',
  in_use: 'success',
  maintenance: 'warning',
  disposed: 'danger',
  scrapped: 'danger',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_use: 'In Use',
  maintenance: 'Maintenance',
  disposed: 'Disposed',
  scrapped: 'Scrapped',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Submitted', value: 'submitted' },
      { label: 'In Use', value: 'in_use' },
      { label: 'Maintenance', value: 'maintenance' },
      { label: 'Disposed', value: 'disposed' },
      { label: 'Scrapped', value: 'scrapped' },
    ],
  },
];

const columns: ColumnDef<Asset, unknown>[] = [
  {
    accessorKey: 'assetNumber',
    header: ({ column }) => <SortableHeader column={column}>Asset #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/assets/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.assetNumber || '\u2014'}
      </Link>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.name || '\u2014'}</span>,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.category || '\u2014'}</span>,
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.location || '\u2014'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status || 'draft';
      return <StatusDot status={statusVariant[s] || 'muted'} label={statusLabels[s] || s} />;
    },
  },
  {
    accessorKey: 'purchaseAmount',
    header: ({ column }) => <SortableHeader column={column}>Purchase</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">{formatCurrency(row.original.purchaseAmount ?? 0)}</span>
    ),
  },
  {
    accessorKey: 'currentValue',
    header: ({ column }) => <SortableHeader column={column}>Current Value</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">{formatCurrency(row.original.currentValue ?? 0)}</span>
    ),
  },
];

export default function AssetListPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAssets();
  const assets = (data ?? []) as Asset[];

  const total = assets.length;
  const inUse = assets.filter((a) => a.status === 'in_use').length;
  const underMaintenance = assets.filter((a) => a.status === 'maintenance').length;
  const totalValue = assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Asset) => {
      router.push(`/assets/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Asset Register"
      subtitle="Complete list of all fixed assets"
      breadcrumbs={[
        { label: 'Assets', href: '/assets' },
        { label: 'Asset Register' },
      ]}
      createButton={{ label: 'New Asset', href: '/assets/new' }}
      summaryCards={[
        { label: 'Total Assets', value: total },
        { label: 'In Use', value: inUse, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Maintenance', value: underMaintenance, icon: <span className="text-amber-500">&#9679;</span> },
        { label: 'Total Value', value: formatCurrency(totalValue) },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={assets}
        isLoading={isLoading}
        searchPlaceholder="Search assets..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No assets found."
        emptyAction={{
          label: 'Add Asset',
          onClick: () => router.push('/assets/new'),
        }}
      />
    </ListPage>
  );
}
