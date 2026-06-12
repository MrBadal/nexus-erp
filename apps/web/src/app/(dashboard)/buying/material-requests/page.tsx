'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useMaterialRequests, type MaterialRequest } from '@/hooks/use-buying';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  submitted: 'info',
  approved: 'success',
  partially_ordered: 'warning',
  ordered: 'success',
  rejected: 'danger',
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
      { label: 'Partially Ordered', value: 'partially_ordered' },
      { label: 'Ordered', value: 'ordered' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
  {
    key: 'requestType',
    label: 'Request Type',
    type: 'checkbox-group',
    options: [
      { label: 'Purchase', value: 'purchase' },
      { label: 'Transfer', value: 'transfer' },
      { label: 'Manufacture', value: 'manufacture' },
    ],
  },
];

const columns: ColumnDef<MaterialRequest, unknown>[] = [
  {
    accessorKey: 'requestNumber',
    header: ({ column }) => <SortableHeader column={column}>Request #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/buying/material-requests/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.requestNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'requestType',
    header: 'Type',
    cell: ({ row }) => (
      <span className="text-sm capitalize">{row.original.requestType}</span>
    ),
  },
  {
    accessorKey: 'requestDate',
    header: ({ column }) => <SortableHeader column={column}>Request Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.requestDate)}</span>,
  },
  {
    accessorKey: 'requiredDate',
    header: 'Required By',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.requiredDate ? formatDate(row.original.requiredDate) : '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => <span className="text-sm">{row.original.department || '\u2014'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status;
      const label = s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return <StatusDot status={statusVariant[s] || 'info'} label={label} />;
    },
  },
];

export default function MaterialRequestsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const statusFilter = filterValues.status as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
  };

  const { data, isLoading } = useMaterialRequests(apiFilters);
  const requests = data ?? [];

  const totalCount = requests.length;
  const approved = requests.filter((r) => r.status === 'approved').length;
  const pending = requests.filter((r) => r.status === 'submitted').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: MaterialRequest) => {
      router.push(`/buying/material-requests/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Material Requests"
      subtitle="Request materials for purchase, transfer, or manufacturing"
      breadcrumbs={[
        { label: 'Buying', href: '/buying' },
        { label: 'Material Requests' },
      ]}
      createButton={{ label: 'New Request', href: '/buying/material-requests/new' }}
      summaryCards={[
        { label: 'Total Requests', value: totalCount },
        { label: 'Pending Approval', value: pending, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Approved', value: approved, icon: <span className="text-green-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={requests}
        isLoading={isLoading}
        searchPlaceholder="Search material requests..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No material requests found."
        emptyAction={{
          label: 'Create Request',
          onClick: () => router.push('/buying/material-requests/new'),
        }}
      />
    </ListPage>
  );
}
