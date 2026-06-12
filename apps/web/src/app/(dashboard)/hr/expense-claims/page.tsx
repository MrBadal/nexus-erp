'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useExpenseClaims, type ExpenseClaim } from '@/hooks/use-hr';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  submitted: 'info',
  approved: 'success',
  rejected: 'danger',
  paid: 'success',
  cancelled: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Submitted', value: 'submitted' },
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'Paid', value: 'paid' },
    ],
  },
];

const columns: ColumnDef<ExpenseClaim, unknown>[] = [
  {
    accessorKey: 'claimNumber',
    header: ({ column }) => <SortableHeader column={column}>Claim #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/hr/expense-claims/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.claimNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'employeeName',
    header: 'Employee',
    cell: ({ row }) => <span className="text-sm">{row.original.employeeName || '\u2014'}</span>,
  },
  {
    accessorKey: 'claimDate',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.claimDate)}</span>,
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => <SortableHeader column={column}>Amount</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(parseFloat(row.original.totalAmount))}</span>
    ),
  },
  {
    accessorKey: 'purpose',
    header: 'Purpose',
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate text-sm">{row.original.purpose || '\u2014'}</span>
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

export default function ExpenseClaimsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const statusFilter = filterValues.status as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
  };

  const { data, isLoading } = useExpenseClaims(apiFilters);
  const claims = data ?? [];

  const totalCount = claims.length;
  const pendingApproval = claims.filter((c) => c.status === 'submitted').length;
  const totalValue = claims.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0);

  return (
    <ListPage
      title="Expense Claims"
      subtitle="Submit and manage employee expense reimbursements"
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Expense Claims' },
      ]}
      createButton={{ label: 'New Claim', href: '/hr/expense-claims/new' }}
      summaryCards={[
        { label: 'Total Claims', value: totalCount },
        { label: 'Pending Approval', value: pendingApproval, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Total Value', value: formatCurrency(totalValue) },
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
        data={claims}
        isLoading={isLoading}
        searchPlaceholder="Search expense claims..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={(row) => router.push(`/hr/expense-claims/${row.id}`)}
        emptyMessage="No expense claims found."
        emptyAction={{
          label: 'Create Claim',
          onClick: () => router.push('/hr/expense-claims/new'),
        }}
      />
    </ListPage>
  );
}
