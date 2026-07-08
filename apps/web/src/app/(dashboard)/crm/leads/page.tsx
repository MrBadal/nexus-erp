'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { Badge } from '@/components/ui/badge';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useLeadQueue, type Lead, type LeadQueueParams } from '@/hooks/use-crm';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  new: 'info',
  contacted: 'warning',
  qualified: 'success',
  unqualified: 'danger',
  converted: 'success',
  lost: 'danger',
};

const priorityVariant: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'New', value: 'new' },
      { label: 'Contacted', value: 'contacted' },
      { label: 'Qualified', value: 'qualified' },
      { label: 'Unqualified', value: 'unqualified' },
      { label: 'Converted', value: 'converted' },
      { label: 'Lost', value: 'lost' },
    ],
  },
  {
    key: 'source',
    label: 'Source',
    type: 'checkbox-group',
    options: [
      { label: 'Website', value: 'website' },
      { label: 'Referral', value: 'referral' },
      { label: 'Social Media', value: 'social_media' },
      { label: 'Cold Call', value: 'cold_call' },
      { label: 'Trade Show', value: 'trade_show' },
      { label: 'Email Campaign', value: 'email_campaign' },
      { label: 'Advertisement', value: 'advertisement' },
      { label: 'Other', value: 'other' },
    ],
  },
  {
    key: 'mine',
    label: 'Assignment',
    type: 'select',
    options: [
      { label: 'Everyone', value: 'all' },
      { label: 'Assigned to me', value: 'me' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { label: 'Any', value: 'any' },
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
    ],
  },
  {
    key: 'followUpDue',
    label: 'Follow-up',
    type: 'select',
    options: [
      { label: 'Any', value: 'any' },
      { label: 'Overdue', value: 'overdue' },
      { label: 'Today', value: 'today' },
      { label: 'This week', value: 'week' },
    ],
  },
];

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <Link href={`/crm/leads/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'company',
    header: 'Company',
    cell: ({ row }) => row.original.company || '-',
  },
  {
    accessorKey: 'ownerName',
    header: 'Owner',
    cell: ({ row }) => row.original.ownerName || 'Unassigned',
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => (
      <Badge variant={priorityVariant[row.original.priority] || 'secondary'} className="capitalize">
        {row.original.priority}
      </Badge>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => row.original.email || '-',
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => (row.original.source || '').replace(/_/g, ' '),
  },
  {
    accessorKey: 'score',
    header: ({ column }) => <SortableHeader column={column} title="Score" />,
    cell: ({ row }) => (
      <span className="font-medium">{row.original.score ?? 0}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusDot status={statusVariant[row.original.status] || 'info'} label={row.original.status} />
    ),
  },
  {
    accessorKey: 'estimatedValue',
    header: ({ column }) => <SortableHeader column={column} title="Est. Value" />,
    cell: ({ row }) =>
      row.original.estimatedValue
        ? `₹${parseFloat(row.original.estimatedValue).toLocaleString('en-IN')}`
        : '-',
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column} title="Created" />,
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export default function LeadsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const queueParams = useMemo<LeadQueueParams>(() => {
    const statusArr = (filterValues.status as string[] | undefined) ?? [];
    const sourceArr = (filterValues.source as string[] | undefined) ?? [];
    const priority = filterValues.priority as string | undefined;
    const followUpDue = filterValues.followUpDue as string | undefined;
    const mine = filterValues.mine as string | undefined;

    return {
      status: statusArr.length > 0 ? statusArr.join(',') : undefined,
      source: sourceArr.length > 0 ? sourceArr.join(',') : undefined,
      priority: priority && priority !== 'any' ? priority : undefined,
      followUpDue:
        followUpDue && followUpDue !== 'any'
          ? (followUpDue as 'overdue' | 'today' | 'week')
          : undefined,
      mine: mine === 'me' ? true : undefined,
      search: search || undefined,
    };
  }, [filterValues, search]);

  const { data, isLoading } = useLeadQueue(queueParams);
  const leads = (data as Lead[] | undefined) ?? [];

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleFilterClear = useCallback(() => {
    setFilterValues({});
    setSearch('');
  }, []);

  return (
    <ListPage
      title="Leads"
      subtitle="Manage your sales leads pipeline"
      createButton={{ label: 'New Lead', href: '/crm/leads/new' }}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={leads}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/crm/leads/${row.id}`)}
        emptyMessage="No leads found. Create your first lead to start building your pipeline."
      />
    </ListPage>
  );
}
