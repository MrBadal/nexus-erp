'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { useWorkstations } from '@/hooks/use-manufacturing';
import { formatCurrency } from '@/lib/utils';

interface Workstation {
  id: string;
  name?: string;
  description?: string;
  hourlyRate?: number;
  productionCapacity?: number;
  workingHours?: number;
  isActive?: boolean;
}

const columns: ColumnDef<Workstation, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Workstation</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/manufacturing/workstations/${row.original.id}`}
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
      <span className="text-sm text-muted-foreground max-w-xs truncate block">
        {row.original.description || '\u2014'}
      </span>
    ),
  },
  {
    accessorKey: 'hourlyRate',
    header: ({ column }) => <SortableHeader column={column}>Hourly Rate</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(row.original.hourlyRate ?? 0)}</span>
    ),
  },
  {
    accessorKey: 'productionCapacity',
    header: ({ column }) => <SortableHeader column={column}>Capacity/Day</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.productionCapacity ?? 0}</span>
    ),
  },
  {
    accessorKey: 'workingHours',
    header: 'Working Hours',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.workingHours ?? 0}h</span>
    ),
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
];

export default function WorkstationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useWorkstations();
  const workstations = (data ?? []) as Workstation[];

  const total = workstations.length;
  const active = workstations.filter((ws) => ws.isActive).length;
  const inactive = workstations.filter((ws) => !ws.isActive).length;

  const handleRowClick = useCallback(
    (row: Workstation) => {
      router.push(`/manufacturing/workstations/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Workstations"
      subtitle="Manage production workstations and their capacity"
      breadcrumbs={[
        { label: 'Manufacturing', href: '/manufacturing' },
        { label: 'Workstations' },
      ]}
      createButton={{ label: 'New Workstation', href: '/manufacturing/workstations/new' }}
      summaryCards={[
        { label: 'Total', value: total },
        { label: 'Active', value: active, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Inactive', value: inactive, icon: <span className="text-red-600">&#9679;</span> },
      ]}
    >
      <DataTable
        columns={columns}
        data={workstations}
        isLoading={isLoading}
        searchPlaceholder="Search workstations..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No workstations found."
        emptyAction={{
          label: 'Add Workstation',
          onClick: () => router.push('/manufacturing/workstations/new'),
        }}
      />
    </ListPage>
  );
}
