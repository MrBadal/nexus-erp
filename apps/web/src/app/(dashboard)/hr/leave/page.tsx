'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLeaveApplications, useApproveLeave, useRejectLeave, type LeaveApplication } from '@/hooks/use-hr';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<LeaveApplication['status'], 'warning' | 'success' | 'danger' | 'muted'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'muted',
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
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
];

export default function LeavePage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const { data, isLoading } = useLeaveApplications();
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();

  const leaves = data ?? [];

  const totalCount = leaves.length;
  const pending = leaves.filter((l) => l.status === 'pending').length;
  const approved = leaves.filter((l) => l.status === 'approved').length;
  const rejected = leaves.filter((l) => l.status === 'rejected').length;

  const handleApprove = useCallback((id: string) => {
    approveMutation.mutate(id, {
      onSuccess: () => toast.success('Leave approved'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to approve')),
    });
  }, [approveMutation]);

  const handleReject = useCallback((id: string) => {
    rejectMutation.mutate(id, {
      onSuccess: () => toast.success('Leave rejected'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to reject')),
    });
  }, [rejectMutation]);

  const columns: ColumnDef<LeaveApplication, unknown>[] = [
    {
      accessorKey: 'employee',
      header: ({ column }) => <SortableHeader column={column}>Employee</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <Link
            href={`/hr/leave/${row.original.id}`}
            className="text-sm font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.employee}
          </Link>
          <div className="font-mono text-xs text-muted-foreground">{row.original.empId}</div>
        </div>
      ),
    },
    {
      accessorKey: 'leaveType',
      header: 'Leave Type',
      cell: ({ row }) => <span className="text-sm">{row.original.leaveType}</span>,
    },
    {
      accessorKey: 'fromDate',
      header: ({ column }) => <SortableHeader column={column}>From</SortableHeader>,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.fromDate)}</span>,
    },
    {
      accessorKey: 'toDate',
      header: 'To',
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.toDate)}</span>,
    },
    {
      accessorKey: 'totalDays',
      header: 'Days',
      cell: ({ row }) => <span className="text-sm font-semibold">{row.original.totalDays}</span>,
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
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (row.original.status !== 'pending') return null;
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600" onClick={() => handleApprove(row.original.id)} disabled={approveMutation.isPending}>
              Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => handleReject(row.original.id)} disabled={rejectMutation.isPending}>
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: LeaveApplication) => {
      router.push(`/hr/leave/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Leave Applications"
      subtitle="Review and manage employee leave requests"
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Leave Management' },
      ]}
      summaryCards={[
        { label: 'Total', value: totalCount },
        { label: 'Pending', value: pending, icon: <span className="text-amber-500">&#9679;</span> },
        { label: 'Approved', value: approved, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Rejected', value: rejected, icon: <span className="text-red-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={leaves}
        isLoading={isLoading}
        searchPlaceholder="Search leave applications..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No leave applications found."
      />
    </ListPage>
  );
}
