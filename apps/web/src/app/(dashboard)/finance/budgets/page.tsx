'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useBudgets, type Budget } from '@/hooks/use-budgets';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  active: 'success',
  closed: 'info',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Active', value: 'active' },
      { label: 'Closed', value: 'closed' },
    ],
  },
];

const columns: ColumnDef<Budget, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Budget Name</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/finance/budgets/${row.original.id}`}
        className="text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'fiscalYear',
    header: 'Fiscal Year',
    cell: ({ row }) => <span className="text-sm">{row.original.fiscalYear}</span>,
  },
  {
    accessorKey: 'fromDate',
    header: 'Period',
    cell: ({ row }) => (
      <span className="text-sm">{formatDate(row.original.fromDate)} - {formatDate(row.original.toDate)}</span>
    ),
  },
  {
    accessorKey: 'totalBudgeted',
    header: ({ column }) => <SortableHeader column={column}>Budgeted</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(parseFloat(row.original.totalBudgeted))}</span>
    ),
  },
  {
    accessorKey: 'totalActual',
    header: 'Actual',
    cell: ({ row }) => {
      const budgeted = parseFloat(row.original.totalBudgeted);
      const actual = parseFloat(row.original.totalActual);
      const isOver = actual > budgeted && budgeted > 0;
      return (
        <span className={`font-mono text-sm ${isOver ? 'text-destructive font-medium' : ''}`}>
          {formatCurrency(actual)}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status;
      return <StatusDot status={statusVariant[s] || 'info'} label={s.charAt(0).toUpperCase() + s.slice(1)} />;
    },
  },
];

export default function BudgetsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const statusFilter = filterValues.status as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
  };

  const { data, isLoading } = useBudgets(apiFilters);
  const budgetList = data ?? [];

  const totalCount = budgetList.length;
  const active = budgetList.filter((b) => b.status === 'active').length;
  const totalBudgeted = budgetList.reduce((sum, b) => sum + parseFloat(b.totalBudgeted), 0);

  return (
    <ListPage
      title="Budgets"
      subtitle="Plan and track financial budgets by account"
      breadcrumbs={[
        { label: 'Finance', href: '/finance' },
        { label: 'Budgets' },
      ]}
      createButton={{ label: 'New Budget', href: '/finance/budgets/new' }}
      summaryCards={[
        { label: 'Total Budgets', value: totalCount },
        { label: 'Active', value: active, icon: <span className="text-green-600">&#9679;</span> },
        { label: 'Total Budgeted', value: formatCurrency(totalBudgeted) },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={useCallback((key: string, value: unknown) => {
        setFilterValues((prev) => ({ ...prev, [key]: value }));
      }, [])}
      onFilterClear={useCallback(() => setFilterValues({}), [])}
    >
      <DataTable
        columns={columns}
        data={budgetList}
        isLoading={isLoading}
        searchPlaceholder="Search budgets..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={(row) => router.push(`/finance/budgets/${row.id}`)}
        emptyMessage="No budgets found."
        emptyAction={{
          label: 'Create Budget',
          onClick: () => router.push('/finance/budgets/new'),
        }}
      />
    </ListPage>
  );
}
