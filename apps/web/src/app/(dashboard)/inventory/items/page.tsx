'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useItems, type Item } from '@/hooks/use-inventory';
import { formatCurrency } from '@/lib/utils';

const typeVariant: Record<Item['itemType'], 'info' | 'default' | 'warning'> = {
  stock: 'info',
  service: 'default',
  consumable: 'warning',
};

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
  {
    key: 'itemType',
    label: 'Type',
    type: 'checkbox-group',
    options: [
      { label: 'Stock', value: 'stock' },
      { label: 'Service', value: 'service' },
      { label: 'Consumable', value: 'consumable' },
    ],
  },
];

const columns: ColumnDef<Item, unknown>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => <SortableHeader column={column}>Code</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/inventory/items/${row.original.id}`}
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
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.category}</span>,
  },
  {
    accessorKey: 'itemType',
    header: 'Type',
    cell: ({ row }) => (
      <StatusDot
        status={typeVariant[row.original.itemType]}
        label={row.original.itemType.charAt(0).toUpperCase() + row.original.itemType.slice(1)}
      />
    ),
  },
  {
    accessorKey: 'unit',
    header: 'Unit',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.unit}</span>,
  },
  {
    accessorKey: 'sellingPrice',
    header: ({ column }) => <SortableHeader column={column}>Selling Price</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(row.original.sellingPrice)}</span>
    ),
  },
  {
    accessorKey: 'stockQty',
    header: ({ column }) => <SortableHeader column={column}>Stock Qty</SortableHeader>,
    cell: ({ row }) => {
      const item = row.original;
      if (item.itemType === 'service') return <span className="text-sm text-muted-foreground">\u2014</span>;
      const isLow = item.stockQty <= item.minStockLevel;
      return (
        <span className={`font-mono text-sm ${isLow ? 'text-red-600 font-semibold' : ''}`}>
          {item.stockQty.toLocaleString()}
        </span>
      );
    },
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

export default function ItemsListPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useItems();
  const items = data ?? [];

  const totalItems = items.length;
  const active = items.filter((i) => i.status === 'active').length;
  const lowStock = items.filter((i) => i.itemType === 'stock' && i.stockQty <= i.minStockLevel).length;
  const totalValue = items.reduce((sum, i) => sum + (i.stockQty || 0) * (i.sellingPrice || 0), 0);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Item) => {
      router.push(`/inventory/items/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Items"
      subtitle="Manage your products, services, and consumables"
      breadcrumbs={[
        { label: 'Inventory', href: '/inventory' },
        { label: 'Items' },
      ]}
      createButton={{ label: 'New Item', href: '/inventory/items/new' }}
      summaryCards={[
        { label: 'Total Items', value: totalItems },
        { label: 'Active', value: active, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Low Stock', value: lowStock, icon: <span className="text-red-600">&#9679;</span> },
        { label: 'Total Value', value: formatCurrency(totalValue) },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        searchPlaceholder="Search items..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No items found."
        emptyAction={{
          label: 'Add Item',
          onClick: () => router.push('/inventory/items/new'),
        }}
      />
    </ListPage>
  );
}
