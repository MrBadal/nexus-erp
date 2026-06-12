'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useDeals, type Deal } from '@/hooks/use-crm';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<Deal['status'], 'info' | 'success' | 'danger'> = {
  open: 'info',
  won: 'success',
  lost: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Open', value: 'open' },
      { label: 'Won', value: 'won' },
      { label: 'Lost', value: 'lost' },
    ],
  },
];

const columns: ColumnDef<Deal, unknown>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column}>Deal</SortableHeader>,
    cell: ({ row }) => (
      <div>
        <Link
          href={`/crm/deals/${row.original.id}`}
          className="text-sm font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.title}
        </Link>
        {row.original.contact && (
          <div className="text-xs text-muted-foreground">{row.original.contact}</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'company',
    header: 'Company',
    cell: ({ row }) => <span className="text-sm">{row.original.company || '\u2014'}</span>,
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.stage || '\u2014'}</span>,
  },
  {
    accessorKey: 'value',
    header: ({ column }) => <SortableHeader column={column}>Value</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">{formatCurrency(row.original.value)}</span>
    ),
  },
  {
    accessorKey: 'probability',
    header: ({ column }) => <SortableHeader column={column}>Probability</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{row.original.probability}%</span>,
  },
  {
    accessorKey: 'expectedClose',
    header: ({ column }) => <SortableHeader column={column}>Expected Close</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.expectedClose ? formatDate(row.original.expectedClose) : '\u2014'}
      </span>
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

export default function DealsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useDeals();
  const deals = data ?? [];

  const total = deals.length;
  const openDeals = deals.filter((d) => d.status === 'open').length;
  const wonDeals = deals.filter((d) => d.status === 'won').length;
  const pipelineValue = deals
    .filter((d) => d.status === 'open')
    .reduce((sum, d) => sum + (d.value || 0), 0);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Deal) => {
      router.push(`/crm/deals/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Deals"
      subtitle="Manage your sales pipeline and track deal progress"
      breadcrumbs={[
        { label: 'CRM', href: '/crm' },
        { label: 'Deals' },
      ]}
      createButton={{ label: 'New Deal', href: '/crm/deals/new' }}
      summaryCards={[
        { label: 'Total Deals', value: total },
        { label: 'Open', value: openDeals, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Won', value: wonDeals, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Pipeline Value', value: formatCurrency(pipelineValue) },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={deals}
        isLoading={isLoading}
        searchPlaceholder="Search deals..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No deals found."
        emptyAction={{
          label: 'Create Deal',
          onClick: () => router.push('/crm/deals/new'),
        }}
      />
    </ListPage>
  );
}
