'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useLoans, type Loan } from '@/hooks/use-loans';
import { formatCurrency } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'info',
  rejected: 'danger',
  closed: 'success',
  cancelled: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'Closed', value: 'closed' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
  {
    key: 'type',
    label: 'Type',
    type: 'checkbox-group',
    options: [
      { label: 'Loan', value: 'loan' },
      { label: 'Advance', value: 'advance' },
    ],
  },
];

const columns: ColumnDef<Loan, unknown>[] = [
  {
    accessorKey: 'loanNumber',
    header: ({ column }) => <SortableHeader column={column}>Loan #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/hr/loans/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.loanNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'employeeName',
    header: 'Employee',
    cell: ({ row }) => <span className="text-sm">{row.original.employeeName || '—'}</span>,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <span className="text-sm capitalize">{row.original.type}</span>
    ),
  },
  {
    accessorKey: 'principalAmount',
    header: ({ column }) => <SortableHeader column={column}>Principal</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(parseFloat(row.original.principalAmount))}</span>
    ),
  },
  {
    accessorKey: 'emiAmount',
    header: 'EMI',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(parseFloat(row.original.emiAmount))}</span>
    ),
  },
  {
    accessorKey: 'outstandingAmount',
    header: ({ column }) => <SortableHeader column={column}>Outstanding</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(parseFloat(row.original.outstandingAmount))}</span>
    ),
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

export default function LoansPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const statusFilter = filterValues.status as string[] | undefined;
  const typeFilter = filterValues.type as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
    type: typeFilter && typeFilter.length === 1 ? typeFilter[0] : undefined,
  };

  const { data, isLoading } = useLoans(apiFilters);
  const loans = data ?? [];

  const activeLoans = loans.filter((l) => l.status === 'approved').length;
  const totalOutstanding = loans.reduce(
    (sum, l) => sum + parseFloat(l.outstandingAmount),
    0,
  );

  return (
    <ListPage
      title="Loans & Advances"
      subtitle="Manage employee loans, advances and repayments"
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Loans & Advances' },
      ]}
      createButton={{ label: 'New Loan', href: '/hr/loans/new' }}
      summaryCards={[
        { label: 'Total Records', value: loans.length },
        { label: 'Active Loans', value: activeLoans, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Total Outstanding', value: formatCurrency(totalOutstanding) },
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
        data={loans}
        isLoading={isLoading}
        searchPlaceholder="Search loans..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={(row) => router.push(`/hr/loans/${row.id}`)}
        emptyMessage="No loans or advances found."
        emptyAction={{
          label: 'Create Loan',
          onClick: () => router.push('/hr/loans/new'),
        }}
      />
    </ListPage>
  );
}
