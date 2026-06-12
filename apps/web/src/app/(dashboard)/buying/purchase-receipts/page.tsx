'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { usePurchaseReceipts, type PurchaseReceipt } from '@/hooks/use-buying';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<PurchaseReceipt['status'], 'warning' | 'info' | 'success'> = {
  draft: 'warning',
  submitted: 'info',
  completed: 'success',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Submitted', value: 'submitted' },
      { label: 'Completed', value: 'completed' },
    ],
  },
];

const columns: ColumnDef<PurchaseReceipt, unknown>[] = [
  {
    accessorKey: 'receiptNumber',
    header: ({ column }) => <SortableHeader column={column}>Receipt #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/buying/purchase-receipts/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.receiptNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'purchaseOrder',
    header: 'PO Reference',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">{row.original.purchaseOrder}</span>
    ),
  },
  {
    accessorKey: 'supplier',
    header: ({ column }) => <SortableHeader column={column}>Supplier</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{row.original.supplier}</span>,
  },
  {
    accessorKey: 'receiptDate',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.receiptDate)}</span>,
  },
  {
    accessorKey: 'warehouse',
    header: 'Warehouse',
    cell: ({ row }) => <span className="text-sm">{row.original.warehouse}</span>,
  },
  {
    accessorKey: 'itemCount',
    header: 'Items',
    cell: ({ row }) => <span className="text-sm">{row.original.itemCount}</span>,
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

export default function PurchaseReceiptsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = usePurchaseReceipts();
  const receipts = data ?? [];

  const totalCount = receipts.length;
  const completed = receipts.filter((r) => r.status === 'completed').length;
  const pending = receipts.filter((r) => r.status !== 'completed').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: PurchaseReceipt) => {
      router.push(`/buying/purchase-receipts/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Purchase Receipts (GRN)"
      subtitle="Goods received notes and quality checks"
      breadcrumbs={[
        { label: 'Buying', href: '/buying' },
        { label: 'Purchase Receipts' },
      ]}
      createButton={{ label: 'New Receipt', href: '/buying/purchase-receipts/new' }}
      summaryCards={[
        { label: 'Total Receipts', value: totalCount },
        { label: 'Completed', value: completed, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Pending', value: pending, icon: <span className="text-amber-500">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={receipts}
        isLoading={isLoading}
        searchPlaceholder="Search receipts..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No purchase receipts found."
        emptyAction={{
          label: 'Create Receipt',
          onClick: () => router.push('/buying/purchase-receipts/new'),
        }}
      />
    </ListPage>
  );
}
