'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useNcrs } from '@/hooks/use-quality';
import { formatDate } from '@/lib/utils';

interface Ncr {
  id: string;
  ncrNumber?: string;
  title?: string;
  severity?: 'minor' | 'major' | 'critical';
  status?: 'open' | 'investigation' | 'corrective_action' | 'closed' | 'void';
  assignedTo?: string;
  dueDate?: string;
  createdAt?: string;
}

const severityVariant: Record<string, 'warning' | 'danger'> = {
  minor: 'warning',
  major: 'danger',
  critical: 'danger',
};

const statusVariant: Record<string, 'info' | 'warning' | 'default' | 'success' | 'muted'> = {
  open: 'info',
  investigation: 'warning',
  corrective_action: 'default',
  closed: 'success',
  void: 'muted',
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  investigation: 'Investigation',
  corrective_action: 'Corrective Action',
  closed: 'Closed',
  void: 'Void',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'severity',
    label: 'Severity',
    type: 'checkbox-group',
    options: [
      { label: 'Minor', value: 'minor' },
      { label: 'Major', value: 'major' },
      { label: 'Critical', value: 'critical' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Open', value: 'open' },
      { label: 'Investigation', value: 'investigation' },
      { label: 'Corrective Action', value: 'corrective_action' },
      { label: 'Closed', value: 'closed' },
      { label: 'Void', value: 'void' },
    ],
  },
];

const columns: ColumnDef<Ncr, unknown>[] = [
  {
    accessorKey: 'ncrNumber',
    header: ({ column }) => <SortableHeader column={column}>NCR #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/quality/ncr/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.ncrNumber || '\u2014'}
      </Link>
    ),
  },
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column}>Title</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm font-medium max-w-[300px] truncate block">{row.original.title || '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => {
      const sev = row.original.severity || 'minor';
      return <StatusDot status={severityVariant[sev] || 'warning'} label={sev.charAt(0).toUpperCase() + sev.slice(1)} />;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status || 'open';
      return <StatusDot status={statusVariant[s] || 'info'} label={statusLabels[s] || s} />;
    },
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assigned To',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.assignedTo || '\u2014'}</span>,
  },
  {
    accessorKey: 'dueDate',
    header: ({ column }) => <SortableHeader column={column}>Due Date</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm">{row.original.dueDate ? formatDate(row.original.dueDate) : '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.createdAt ? formatDate(row.original.createdAt) : '\u2014'}</span>
    ),
  },
];

export default function NcrPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useNcrs();
  const ncrs = (data ?? []) as Ncr[];

  const total = ncrs.length;
  const open = ncrs.filter((n) => n.status === 'open' || n.status === 'investigation' || n.status === 'corrective_action').length;
  const critical = ncrs.filter((n) => n.severity === 'critical' && n.status !== 'closed' && n.status !== 'void').length;
  const closed = ncrs.filter((n) => n.status === 'closed').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Ncr) => {
      router.push(`/quality/ncr/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Non-Conformance Reports"
      subtitle="Track and resolve quality non-conformances"
      breadcrumbs={[
        { label: 'Quality', href: '/quality' },
        { label: 'NCR' },
      ]}
      createButton={{ label: 'New NCR', href: '/quality/ncr/new' }}
      summaryCards={[
        { label: 'Total NCRs', value: total },
        { label: 'Open', value: open, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Critical', value: critical, icon: <span className="text-red-600">&#9679;</span> },
        { label: 'Closed', value: closed, icon: <span className="text-emerald-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={ncrs}
        isLoading={isLoading}
        searchPlaceholder="Search NCRs..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No NCRs found."
        emptyAction={{
          label: 'Create NCR',
          onClick: () => router.push('/quality/ncr/new'),
        }}
      />
    </ListPage>
  );
}
