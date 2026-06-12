'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useTimesheets } from '@/hooks/use-projects';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Timesheet {
  id: string;
  employeeName?: string;
  project?: string;
  task?: string;
  activityType?: string;
  date?: string;
  hours?: number;
  billingHours?: number;
  billingRate?: number;
  billingAmount?: number;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  description?: string;
}

const statusVariant: Record<string, 'muted' | 'info' | 'success' | 'danger'> = {
  draft: 'muted',
  submitted: 'info',
  approved: 'success',
  rejected: 'danger',
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
    ],
  },
];

const columns: ColumnDef<Timesheet, unknown>[] = [
  {
    accessorKey: 'employeeName',
    header: ({ column }) => <SortableHeader column={column}>Employee</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/projects/timesheets/${row.original.id}`}
        className="text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.employeeName || '\u2014'}
      </Link>
    ),
  },
  {
    accessorKey: 'project',
    header: 'Project',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.project || '\u2014'}</span>,
  },
  {
    accessorKey: 'task',
    header: 'Task',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.task || '\u2014'}</span>,
  },
  {
    accessorKey: 'activityType',
    header: 'Activity',
    cell: ({ row }) => <span className="text-sm">{row.original.activityType || '\u2014'}</span>,
  },
  {
    accessorKey: 'date',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm">{row.original.date ? formatDate(row.original.date) : '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'hours',
    header: ({ column }) => <SortableHeader column={column}>Hours</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{(row.original.hours ?? 0).toFixed(1)}</span>
    ),
  },
  {
    accessorKey: 'billingAmount',
    header: ({ column }) => <SortableHeader column={column}>Billing</SortableHeader>,
    cell: ({ row }) => (
      <div className="text-right">
        <div className="font-mono text-sm">{formatCurrency(row.original.billingAmount ?? 0)}</div>
        {row.original.billingRate ? (
          <div className="text-[10px] text-muted-foreground">@{formatCurrency(row.original.billingRate)}/hr</div>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status || 'draft';
      return (
        <StatusDot
          status={statusVariant[s] || 'muted'}
          label={s.charAt(0).toUpperCase() + s.slice(1)}
        />
      );
    },
  },
];

export default function TimesheetsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useTimesheets();
  const timesheets = (data ?? []) as Timesheet[];

  const totalHours = timesheets.reduce((sum, t) => sum + (t.hours ?? 0), 0);
  const totalBilling = timesheets.reduce((sum, t) => sum + (t.billingAmount ?? 0), 0);
  const pendingApproval = timesheets.filter((t) => t.status === 'submitted').length;
  const approved = timesheets.filter((t) => t.status === 'approved').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Timesheet) => {
      router.push(`/projects/timesheets/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Timesheets"
      subtitle="Track time entries and billing across projects"
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: 'Timesheets' },
      ]}
      createButton={{ label: 'New Entry', href: '/projects/timesheets/new' }}
      summaryCards={[
        { label: 'Total Hours', value: totalHours.toFixed(1) },
        { label: 'Total Billing', value: formatCurrency(totalBilling) },
        { label: 'Pending Approval', value: pendingApproval, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Approved', value: approved, icon: <span className="text-emerald-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={timesheets}
        isLoading={isLoading}
        searchPlaceholder="Search timesheets..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No timesheet entries found."
        emptyAction={{
          label: 'Log Time',
          onClick: () => router.push('/projects/timesheets/new'),
        }}
      />
    </ListPage>
  );
}
