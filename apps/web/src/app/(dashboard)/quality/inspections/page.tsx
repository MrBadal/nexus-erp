'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useQualityInspections } from '@/hooks/use-quality';
import { formatDate } from '@/lib/utils';

interface QualityInspection {
  id: string;
  inspectionNumber?: string;
  itemName?: string;
  referenceType?: 'incoming' | 'in_process' | 'outgoing';
  inspectionDate?: string;
  inspectedBy?: string;
  status?: 'draft' | 'in_progress' | 'accepted' | 'rejected' | 'on_hold';
  batchNumber?: string;
  sampleSize?: number;
  acceptedQty?: number;
  rejectedQty?: number;
}

const statusVariant: Record<string, 'muted' | 'info' | 'success' | 'danger' | 'warning'> = {
  draft: 'muted',
  in_progress: 'info',
  accepted: 'success',
  rejected: 'danger',
  on_hold: 'warning',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  accepted: 'Accepted',
  rejected: 'Rejected',
  on_hold: 'On Hold',
};

const typeVariant: Record<string, 'info' | 'default' | 'success'> = {
  incoming: 'info',
  in_process: 'default',
  outgoing: 'success',
};

const typeLabels: Record<string, string> = {
  incoming: 'Incoming',
  in_process: 'In Process',
  outgoing: 'Outgoing',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Accepted', value: 'accepted' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'On Hold', value: 'on_hold' },
    ],
  },
  {
    key: 'referenceType',
    label: 'Type',
    type: 'checkbox-group',
    options: [
      { label: 'Incoming', value: 'incoming' },
      { label: 'In Process', value: 'in_process' },
      { label: 'Outgoing', value: 'outgoing' },
    ],
  },
];

const columns: ColumnDef<QualityInspection, unknown>[] = [
  {
    accessorKey: 'inspectionNumber',
    header: ({ column }) => <SortableHeader column={column}>Inspection #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/quality/inspections/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.inspectionNumber || '\u2014'}
      </Link>
    ),
  },
  {
    accessorKey: 'itemName',
    header: ({ column }) => <SortableHeader column={column}>Item</SortableHeader>,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.itemName || '\u2014'}</span>,
  },
  {
    accessorKey: 'referenceType',
    header: 'Type',
    cell: ({ row }) => {
      const t = row.original.referenceType || 'incoming';
      return <StatusDot status={typeVariant[t] || 'info'} label={typeLabels[t] || t} />;
    },
  },
  {
    accessorKey: 'inspectionDate',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm">{row.original.inspectionDate ? formatDate(row.original.inspectionDate) : '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'batchNumber',
    header: 'Batch',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">{row.original.batchNumber || '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'sampleSize',
    header: 'Sample',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.sampleSize ?? 0}</span>,
  },
  {
    id: 'results',
    header: 'Pass / Fail',
    cell: ({ row }) => {
      const acc = row.original.acceptedQty ?? 0;
      const rej = row.original.rejectedQty ?? 0;
      if (acc === 0 && rej === 0) return <span className="text-muted-foreground text-sm">\u2014</span>;
      return (
        <span className="font-mono text-sm">
          <span className="text-emerald-600">{acc}</span>
          {' / '}
          <span className="text-red-600">{rej}</span>
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status || 'draft';
      return <StatusDot status={statusVariant[s] || 'muted'} label={statusLabels[s] || s} />;
    },
  },
];

export default function InspectionsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQualityInspections();
  const inspections = (data ?? []) as QualityInspection[];

  const total = inspections.length;
  const accepted = inspections.filter((i) => i.status === 'accepted').length;
  const rejected = inspections.filter((i) => i.status === 'rejected').length;
  const inProgress = inspections.filter((i) => i.status === 'in_progress' || i.status === 'draft').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: QualityInspection) => {
      router.push(`/quality/inspections/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Quality Inspections"
      subtitle="Track incoming, in-process, and outgoing inspections"
      breadcrumbs={[
        { label: 'Quality', href: '/quality' },
        { label: 'Inspections' },
      ]}
      createButton={{ label: 'New Inspection', href: '/quality/inspections/new' }}
      summaryCards={[
        { label: 'Total', value: total },
        { label: 'Accepted', value: accepted, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Rejected', value: rejected, icon: <span className="text-red-600">&#9679;</span> },
        { label: 'Pending', value: inProgress, icon: <span className="text-blue-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={inspections}
        isLoading={isLoading}
        searchPlaceholder="Search inspections..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No inspections found."
        emptyAction={{
          label: 'Create Inspection',
          onClick: () => router.push('/quality/inspections/new'),
        }}
      />
    </ListPage>
  );
}
