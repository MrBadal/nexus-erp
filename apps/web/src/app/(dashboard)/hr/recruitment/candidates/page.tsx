'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useCandidates, type Candidate } from '@/hooks/use-recruitment';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  new: 'info',
  screening: 'warning',
  shortlisted: 'info',
  interview: 'warning',
  offered: 'info',
  hired: 'success',
  rejected: 'danger',
  withdrawn: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'New', value: 'new' },
      { label: 'Screening', value: 'screening' },
      { label: 'Shortlisted', value: 'shortlisted' },
      { label: 'Interview', value: 'interview' },
      { label: 'Offered', value: 'offered' },
      { label: 'Hired', value: 'hired' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'Withdrawn', value: 'withdrawn' },
    ],
  },
];

const columns: ColumnDef<Candidate>[] = [
  {
    accessorKey: 'firstName',
    header: ({ column }) => <SortableHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <Link href={`/hr/recruitment/candidates/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.firstName} {row.original.lastName}
      </Link>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'jobTitle',
    header: 'Applied For',
    cell: ({ row }) => row.original.jobTitle || '-',
  },
  {
    accessorKey: 'experienceYears',
    header: 'Experience',
    cell: ({ row }) => row.original.experienceYears ? `${row.original.experienceYears} yrs` : '-',
  },
  {
    accessorKey: 'expectedSalary',
    header: 'Expected CTC',
    cell: ({ row }) =>
      row.original.expectedSalary
        ? `₹${parseFloat(row.original.expectedSalary).toLocaleString('en-IN')}`
        : '-',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusDot status={statusVariant[row.original.status] || 'info'} label={row.original.status} />
    ),
  },
  {
    accessorKey: 'rating',
    header: 'Rating',
    cell: ({ row }) => row.original.rating ? `${row.original.rating}/5` : '-',
  },
  {
    accessorKey: 'appliedAt',
    header: ({ column }) => <SortableHeader column={column} title="Applied" />,
    cell: ({ row }) => formatDate(row.original.appliedAt),
  },
];

export default function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobOpeningId = searchParams.get('jobOpeningId') || undefined;
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const { data, isLoading } = useCandidates({
    ...filterValues,
    jobOpeningId,
    search: search || undefined,
  });
  const items = (data as Candidate[] | undefined) ?? [];

  const handleSearch = useCallback((value: string) => setSearch(value), []);
  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleFilterClear = useCallback(() => setFilterValues({}), []);

  return (
    <ListPage
      title="Candidates"
      subtitle="Track and manage candidate applications"
      createButton={{ label: 'Add Candidate', href: '/hr/recruitment/candidates/new' }}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/hr/recruitment/candidates/${row.id}`)}
        emptyMessage="No candidates found. Add candidates to start tracking applications."
      />
    </ListPage>
  );
}
