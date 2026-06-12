'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useProjectTasks } from '@/hooks/use-projects';

interface ProjectTask {
  id: string;
  taskNumber?: string;
  name?: string;
  project?: string;
  status?: 'open' | 'working' | 'pending_review' | 'completed' | 'cancelled' | 'overdue';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  percentComplete?: number;
  estimatedHours?: number;
  actualHours?: number;
  isMilestone?: boolean;
}

const statusVariant: Record<string, 'muted' | 'info' | 'warning' | 'success' | 'danger'> = {
  open: 'muted',
  working: 'info',
  pending_review: 'warning',
  completed: 'success',
  cancelled: 'danger',
  overdue: 'danger',
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  working: 'Working',
  pending_review: 'Pending Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
};

const priorityVariant: Record<string, 'muted' | 'info' | 'warning' | 'danger'> = {
  low: 'muted',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Open', value: 'open' },
      { label: 'Working', value: 'working' },
      { label: 'Pending Review', value: 'pending_review' },
      { label: 'Completed', value: 'completed' },
      { label: 'Overdue', value: 'overdue' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'checkbox-group',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
      { label: 'Critical', value: 'critical' },
    ],
  },
];

const columns: ColumnDef<ProjectTask, unknown>[] = [
  {
    accessorKey: 'taskNumber',
    header: ({ column }) => <SortableHeader column={column}>Task #</SortableHeader>,
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        {row.original.isMilestone && <span className="inline-block w-2 h-2 bg-amber-400 rotate-45 flex-shrink-0" />}
        <Link
          href={`/projects/tasks/${row.original.id}`}
          className="font-mono text-sm font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.taskNumber || '\u2014'}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.name || '\u2014'}</span>,
  },
  {
    accessorKey: 'project',
    header: 'Project',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.project || '\u2014'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status || 'open';
      return <StatusDot status={statusVariant[s] || 'muted'} label={statusLabels[s] || s} />;
    },
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const p = row.original.priority || 'medium';
      return <StatusDot status={priorityVariant[p] || 'muted'} label={p.charAt(0).toUpperCase() + p.slice(1)} />;
    },
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assigned To',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.assignedTo || '\u2014'}</span>,
  },
  {
    id: 'progress',
    header: 'Progress',
    cell: ({ row }) => {
      const pct = row.original.percentComplete ?? 0;
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full overflow-hidden bg-gray-200">
            <div
              className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      );
    },
  },
  {
    id: 'hours',
    header: 'Hours',
    cell: ({ row }) => (
      <div className="text-right">
        <span className="font-mono text-xs">{row.original.actualHours ?? 0}</span>
        <span className="text-[10px] text-muted-foreground"> / {row.original.estimatedHours ?? 0}h</span>
      </div>
    ),
  },
];

export default function TasksPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useProjectTasks();
  const tasks = (data ?? []) as ProjectTask[];

  const total = tasks.length;
  const open = tasks.filter((t) => t.status === 'open').length;
  const working = tasks.filter((t) => t.status === 'working').length;
  const overdue = tasks.filter((t) => t.status === 'overdue').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: ProjectTask) => {
      router.push(`/projects/tasks/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Tasks"
      subtitle="Track tasks across all projects"
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: 'Tasks' },
      ]}
      createButton={{ label: 'New Task', href: '/projects/tasks/new' }}
      summaryCards={[
        { label: 'Total Tasks', value: total },
        { label: 'Open', value: open, icon: <span className="text-gray-500">&#9679;</span> },
        { label: 'In Progress', value: working, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Overdue', value: overdue, icon: <span className="text-red-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={tasks}
        isLoading={isLoading}
        searchPlaceholder="Search tasks..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No tasks found."
        emptyAction={{
          label: 'Create Task',
          onClick: () => router.push('/projects/tasks/new'),
        }}
      />
    </ListPage>
  );
}
