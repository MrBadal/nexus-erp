'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { useAssetCategories } from '@/hooks/use-assets';

interface AssetCategory {
  id: string;
  name?: string;
  description?: string;
  depreciationMethod?: string;
  usefulLife?: number;
  assetCount?: number;
  isActive?: boolean;
}

const columns: ColumnDef<AssetCategory, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Category Name</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/assets/categories/${row.original.id}`}
        className="text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.name || '\u2014'}
      </Link>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground max-w-[300px] truncate block">
        {row.original.description || '\u2014'}
      </span>
    ),
  },
  {
    accessorKey: 'depreciationMethod',
    header: 'Depreciation Method',
    cell: ({ row }) => <span className="text-sm">{row.original.depreciationMethod || '\u2014'}</span>,
  },
  {
    accessorKey: 'usefulLife',
    header: ({ column }) => <SortableHeader column={column}>Useful Life</SortableHeader>,
    cell: ({ row }) => {
      const life = row.original.usefulLife ?? 0;
      return <span className="text-sm text-muted-foreground">{life > 0 ? `${life} months` : 'N/A'}</span>;
    },
  },
  {
    accessorKey: 'assetCount',
    header: ({ column }) => <SortableHeader column={column}>Assets</SortableHeader>,
    cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.assetCount ?? 0}</span>,
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <StatusDot
        status={row.original.isActive ? 'success' : 'muted'}
        label={row.original.isActive ? 'Active' : 'Inactive'}
      />
    ),
  },
];

export default function AssetCategoriesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAssetCategories();
  const categories = (data ?? []) as AssetCategory[];

  const total = categories.length;
  const active = categories.filter((c) => c.isActive).length;
  const totalAssets = categories.reduce((sum, c) => sum + (c.assetCount ?? 0), 0);

  const handleRowClick = useCallback(
    (row: AssetCategory) => {
      router.push(`/assets/categories/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Asset Categories"
      subtitle="Define asset categories with depreciation policies"
      breadcrumbs={[
        { label: 'Assets', href: '/assets' },
        { label: 'Categories' },
      ]}
      createButton={{ label: 'New Category', href: '/assets/categories/new' }}
      summaryCards={[
        { label: 'Total Categories', value: total },
        { label: 'Active', value: active, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Total Assets', value: totalAssets },
      ]}
    >
      <DataTable
        columns={columns}
        data={categories}
        isLoading={isLoading}
        searchPlaceholder="Search categories..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No asset categories found."
        emptyAction={{
          label: 'Create Category',
          onClick: () => router.push('/assets/categories/new'),
        }}
      />
    </ListPage>
  );
}
