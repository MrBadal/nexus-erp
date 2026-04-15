'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useQuotations, type Quotation } from '@/hooks/use-selling';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<Quotation['status'], 'warning' | 'info' | 'success' | 'danger' | 'muted'> = {
  draft: 'warning',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'muted',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Sent', value: 'sent' },
      { label: 'Accepted', value: 'accepted' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'Expired', value: 'expired' },
    ],
  },
];

const columns: ColumnDef<Quotation, unknown>[] = [
  {
    accessorKey: 'quotationNumber',
    header: ({ column }) => <SortableHeader column={column}>Quotation #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/selling/quotations/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.quotationNumber}
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
    accessorKey: 'quotationDate',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.quotationDate)}</span>,
  },
  {
    accessorKey: 'validUntil',
    header: 'Valid Until',
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.validUntil)}</span>,
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

export default function QuotationsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const statusFilter = filterValues.status as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
  };

  const { data, isLoading } = useQuotations(apiFilters);
  const quotations = data ?? [];

  const totalCount = quotations.length;
  const sent = quotations.filter((q) => q.status === 'sent').length;
  const accepted = quotations.filter((q) => q.status === 'accepted').length;
  const totalValue = quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Quotation) => {
      router.push(`/selling/quotations/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Quotations"
      subtitle="Manage sales quotations and proposals"
      breadcrumbs={[
        { label: 'Selling', href: '/selling' },
        { label: 'Quotations' },
      ]}
      createButton={{ label: 'New Quotation', href: '/selling/quotations/new' }}
      summaryCards={[
        { label: 'Total Quotations', value: totalCount },
        { label: 'Sent', value: sent, icon: <span className="text-blue-600">&#9679;</span> },
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
        emptyMessage="No quotations found."
        emptyAction={{
          label: 'Create Quotation',
          onClick: () => router.push('/selling/quotations/new'),
        }}
      />
    </ListPage>
  );
}
