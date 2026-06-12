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
import { useActivities, useCompleteActivity, type CrmActivity } from '@/hooks/use-crm';
import { formatDate } from '@/lib/utils';

const typeVariant: Record<CrmActivity['type'], 'info' | 'success' | 'warning' | 'default' | 'muted'> = {
  call: 'info',
  email: 'success',
  meeting: 'warning',
  task: 'default',
  note: 'muted',
};

const statusVariant: Record<CrmActivity['status'], 'warning' | 'success' | 'muted'> = {
  pending: 'warning',
  completed: 'success',
  cancelled: 'muted',
};

const priorityVariant: Record<CrmActivity['priority'], 'danger' | 'warning' | 'muted'> = {
  high: 'danger',
  medium: 'warning',
  low: 'muted',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'type',
    label: 'Type',
    type: 'checkbox-group',
    options: [
      { label: 'Call', value: 'call' },
      { label: 'Email', value: 'email' },
      { label: 'Meeting', value: 'meeting' },
      { label: 'Task', value: 'task' },
      { label: 'Note', value: 'note' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Completed', value: 'completed' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'checkbox-group',
    options: [
      { label: 'High', value: 'high' },
      { label: 'Medium', value: 'medium' },
      { label: 'Low', value: 'low' },
    ],
  },
];

export default function ActivitiesPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const { data, isLoading } = useActivities();
  const completeMutation = useCompleteActivity();

  const activities = data ?? [];

  const total = activities.length;
  const pending = activities.filter((a) => a.status === 'pending').length;
  const completed = activities.filter((a) => a.status === 'completed').length;
  const highPriority = activities.filter((a) => a.priority === 'high' && a.status === 'pending').length;

  const handleComplete = useCallback(
    (id: string) => {
      completeMutation.mutate(id, {
        onSuccess: () => toast.success('Activity marked as completed'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to complete activity')),
      });
    },
    [completeMutation],
  );

  const columns: ColumnDef<CrmActivity, unknown>[] = [
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const t = row.original.type;
        return (
          <StatusDot
            status={typeVariant[t]}
            label={t.charAt(0).toUpperCase() + t.slice(1)}
          />
        );
      },
    },
    {
      accessorKey: 'subject',
      header: ({ column }) => <SortableHeader column={column}>Subject</SortableHeader>,
      cell: ({ row }) => (
        <Link
          href={`/crm/activities/${row.original.id}`}
          className="text-sm font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.subject}
        </Link>
      ),
    },
    {
      accessorKey: 'contact',
      header: 'Contact',
      cell: ({ row }) => <span className="text-sm">{row.original.contact || '\u2014'}</span>,
    },
    {
      accessorKey: 'deal',
      header: 'Deal',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.deal || '\u2014'}</span>,
    },
    {
      accessorKey: 'dueDate',
      header: ({ column }) => <SortableHeader column={column}>Due Date</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.dueDate ? formatDate(row.original.dueDate) : '\u2014'}</span>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const p = row.original.priority;
        return (
          <StatusDot
            status={priorityVariant[p]}
            label={p.charAt(0).toUpperCase() + p.slice(1)}
          />
        );
      },
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
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handleComplete(row.original.id)}
              disabled={completeMutation.isPending}
            >
              Complete
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
    (row: CrmActivity) => {
      router.push(`/crm/activities/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Activities"
      subtitle="Track calls, emails, meetings, and tasks"
      breadcrumbs={[
        { label: 'CRM', href: '/crm' },
        { label: 'Activities' },
      ]}
      createButton={{ label: 'Log Activity', href: '/crm/activities/new' }}
      summaryCards={[
        { label: 'Total', value: total },
        { label: 'Pending', value: pending, icon: <span className="text-amber-500">&#9679;</span> },
        { label: 'Completed', value: completed, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'High Priority', value: highPriority, icon: <span className="text-red-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={activities}
        isLoading={isLoading}
        searchPlaceholder="Search activities..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No activities found."
        emptyAction={{
          label: 'Log Activity',
          onClick: () => router.push('/crm/activities/new'),
        }}
      />
    </ListPage>
  );
}
