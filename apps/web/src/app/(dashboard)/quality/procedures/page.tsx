'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { useQualityProcedures } from '@/hooks/use-quality';
import { formatDate } from '@/lib/utils';

interface QualityProcedure {
  id: string;
  name?: string;
  description?: string;
  processOwner?: string;
  isActive?: boolean;
  stepsCount?: number;
  updatedAt?: string;
}

const columns: ColumnDef<QualityProcedure, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Procedure Name</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/quality/procedures/${row.original.id}`}
        className="text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.name || '\u2014'}
      </Link>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground max-w-[300px] truncate block">
        {row.original.description || '\u2014'}
      </span>
    ),
  },
  {
    accessorKey: 'processOwner',
    header: 'Process Owner',
    cell: ({ row }) => <span className="text-sm">{row.original.processOwner || '\u2014'}</span>,
  },
  {
    accessorKey: 'stepsCount',
    header: ({ column }) => <SortableHeader column={column}>Steps</SortableHeader>,
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.stepsCount ?? 0}</span>,
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <StatusDot
        status={row.original.isActive ? 'success' : 'muted'}
        label={row.original.isActive ? 'Active' : 'Inactive'}
      />
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <SortableHeader column={column}>Last Updated</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.updatedAt ? formatDate(row.original.updatedAt) : '\u2014'}
      </span>
    ),
  },
];

export default function ProceduresPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQualityProcedures();
  const procedures = (data ?? []) as QualityProcedure[];

  const total = procedures.length;
  const active = procedures.filter((p) => p.isActive).length;
  const inactive = procedures.filter((p) => !p.isActive).length;

  const handleRowClick = useCallback(
    (row: QualityProcedure) => {
      router.push(`/quality/procedures/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Quality Procedures"
      subtitle="Define and manage standard quality control procedures"
      breadcrumbs={[
        { label: 'Quality', href: '/quality' },
        { label: 'Procedures' },
      ]}
      createButton={{ label: 'New Procedure', href: '/quality/procedures/new' }}
      summaryCards={[
        { label: 'Total', value: total },
        { label: 'Active', value: active, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Inactive', value: inactive, icon: <span className="text-gray-500">&#9679;</span> },
      ]}
    >
      <DataTable
        columns={columns}
        data={procedures}
        isLoading={isLoading}
        searchPlaceholder="Search procedures..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No procedures found."
        emptyAction={{
          label: 'Create Procedure',
          onClick: () => router.push('/quality/procedures/new'),
        }}
      />
    </ListPage>
  );
}
