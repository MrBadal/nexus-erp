'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { useSlaPolicies } from '@/hooks/use-helpdesk';

interface SlaPolicy {
  id: string;
  name?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  firstResponseHours?: number;
  resolutionHours?: number;
  isActive?: boolean;
  escalateTo?: string;
}

const priorityVariant: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

function formatHours(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remaining = hours % 24;
  if (remaining === 0) return `${days}d`;
  return `${days}d ${remaining}h`;
}

const columns: ColumnDef<SlaPolicy, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Policy Name</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/helpdesk/sla/${row.original.id}`}
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
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const p = row.original.priority || 'medium';
      return <StatusDot status={priorityVariant[p] || 'info'} label={p.charAt(0).toUpperCase() + p.slice(1)} />;
    },
  },
  {
    accessorKey: 'firstResponseHours',
    header: ({ column }) => <SortableHeader column={column}>First Response</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{formatHours(row.original.firstResponseHours ?? 0)}</span>
    ),
  },
  {
    accessorKey: 'resolutionHours',
    header: ({ column }) => <SortableHeader column={column}>Resolution</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{formatHours(row.original.resolutionHours ?? 0)}</span>
    ),
  },
  {
    accessorKey: 'escalateTo',
    header: 'Escalate To',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.escalateTo || '\u2014'}</span>,
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

export default function SlaPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useSlaPolicies();
  const policies = (data ?? []) as SlaPolicy[];

  const total = policies.length;
  const active = policies.filter((p) => p.isActive).length;
  const inactive = policies.filter((p) => !p.isActive).length;

  const handleRowClick = useCallback(
    (row: SlaPolicy) => {
      router.push(`/helpdesk/sla/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="SLA Policies"
      subtitle="Define service level agreements for ticket resolution"
      breadcrumbs={[
        { label: 'Helpdesk', href: '/helpdesk' },
        { label: 'SLA Policies' },
      ]}
      createButton={{ label: 'New SLA Policy', href: '/helpdesk/sla/new' }}
      summaryCards={[
        { label: 'Total Policies', value: total },
        { label: 'Active', value: active, icon: <span className="text-green-600">&#9679;</span> },
        { label: 'Inactive', value: inactive, icon: <span className="text-gray-600">&#9679;</span> },
      ]}
    >
      <DataTable
        columns={columns}
        data={policies}
        isLoading={isLoading}
        searchPlaceholder="Search SLA policies..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No SLA policies found."
        emptyAction={{
          label: 'Create SLA Policy',
          onClick: () => router.push('/helpdesk/sla/new'),
        }}
      />
    </ListPage>
  );
}
