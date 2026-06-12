'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useJobOpenings, type JobOpening } from '@/hooks/use-recruitment';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  open: 'success',
  on_hold: 'warning',
  closed: 'info',
  cancelled: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Open', value: 'open' },
      { label: 'On Hold', value: 'on_hold' },
      { label: 'Closed', value: 'closed' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
];

const columns: ColumnDef<JobOpening>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column} title="Title" />,
    cell: ({ row }) => (
      <Link href={`/hr/recruitment/job-openings/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'positions',
    header: 'Positions',
    cell: ({ row }) => `${row.original.filledPositions || 0} / ${row.original.positions}`,
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => row.original.location || '-',
  },
  {
    accessorKey: 'employmentType',
    header: 'Type',
    cell: ({ row }) => (row.original.employmentType || '').replace(/_/g, ' '),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusDot status={statusVariant[row.original.status] || 'info'} label={row.original.status.replace(/_/g, ' ')} />
    ),
  },
  {
    accessorKey: 'closingDate',
    header: ({ column }) => <SortableHeader column={column} title="Closing Date" />,
    cell: ({ row }) => row.original.closingDate ? formatDate(row.original.closingDate) : '-',
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column} title="Created" />,
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export default function JobOpeningsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const { data, isLoading } = useJobOpenings({ ...filterValues, search: search || undefined });
  const jobs = (data as JobOpening[] | undefined) ?? [];

  const handleSearch = useCallback((value: string) => setSearch(value), []);
  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleFilterClear = useCallback(() => setFilterValues({}), []);

  return (
    <ListPage
      title="Job Openings"
      subtitle="Manage recruitment job openings"
      createButton={{ label: 'New Job Opening', href: '/hr/recruitment/job-openings/new' }}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={jobs}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/hr/recruitment/job-openings/${row.id}`)}
        emptyMessage="No job openings found. Create your first job opening to start recruiting."
      />
    </ListPage>
  );
}
