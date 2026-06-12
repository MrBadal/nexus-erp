'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useSupplierQuotations, type SupplierQuotation } from '@/hooks/use-buying';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<SupplierQuotation['status'], 'warning' | 'info' | 'default' | 'success' | 'danger'> = {
  draft: 'warning',
  sent: 'info',
  received: 'default',
  accepted: 'success',
  rejected: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Sent', value: 'sent' },
      { label: 'Received', value: 'received' },
      { label: 'Accepted', value: 'accepted' },
      { label: 'Rejected', value: 'rejected' },
    ],
  },
];

const columns: ColumnDef<SupplierQuotation, unknown>[] = [
  {
    accessorKey: 'quotationNumber',
    header: ({ column }) => <SortableHeader column={column}>Quotation #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/buying/supplier-quotations/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.quotationNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'supplier',
    header: ({ column }) => <SortableHeader column={column}>Supplier</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{row.original.supplier}</span>,
  },
  {
    accessorKey: 'quotationDate',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.quotationDate)}</span>,
  },
  {
    accessorKey: 'validUntil',
    header: 'Valid Until',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.validUntil ? formatDate(row.original.validUntil) : '\u2014'}</span>
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

export default function SupplierQuotationsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useSupplierQuotations();
  const quotations = data ?? [];

  const totalCount = quotations.length;
  const received = quotations.filter((q) => q.status === 'received').length;
  const accepted = quotations.filter((q) => q.status === 'accepted').length;
  const totalValue = quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: SupplierQuotation) => {
      router.push(`/buying/supplier-quotations/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Supplier Quotations"
      subtitle="Request and compare supplier quotes"
      breadcrumbs={[
        { label: 'Buying', href: '/buying' },
        { label: 'Supplier Quotations' },
      ]}
      createButton={{ label: 'New Request', href: '/buying/supplier-quotations/new' }}
      summaryCards={[
        { label: 'Total', value: totalCount },
        { label: 'Received', value: received, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Accepted', value: accepted, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Total Value', value: formatCurrency(totalValue) },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={quotations}
        isLoading={isLoading}
        searchPlaceholder="Search quotations..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No supplier quotations found."
        emptyAction={{
          label: 'Request Quote',
          onClick: () => router.push('/buying/supplier-quotations/new'),
        }}
      />
    </ListPage>
  );
}
