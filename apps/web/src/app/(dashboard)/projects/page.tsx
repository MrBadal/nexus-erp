'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useProjects } from '@/hooks/use-projects';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Project {
  id: string;
  projectNumber?: string;
  name?: string;
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  projectManager?: string;
  department?: string;
  percentComplete?: number;
  startDate?: string;
  endDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  taskCount?: number;
}

const statusVariant: Record<string, 'muted' | 'info' | 'warning' | 'success' | 'danger'> = {
  planning: 'muted',
  active: 'info',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

const statusLabels: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
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
      { label: 'Planning', value: 'planning' },
      { label: 'Active', value: 'active' },
      { label: 'On Hold', value: 'on_hold' },
      { label: 'Completed', value: 'completed' },
      { label: 'Cancelled', value: 'cancelled' },
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

const columns: ColumnDef<Project, unknown>[] = [
  {
    accessorKey: 'projectNumber',
    header: ({ column }) => <SortableHeader column={column}>Project #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/projects/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.projectNumber || '\u2014'}
      </Link>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.name || '\u2014'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status || 'planning';
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
    accessorKey: 'projectManager',
    header: 'Manager',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.projectManager || '\u2014'}</span>,
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.department || '\u2014'}</span>,
  },
  {
    id: 'progress',
    header: 'Progress',
    cell: ({ row }) => {
      const pct = row.original.percentComplete ?? 0;
      return (
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 rounded-full overflow-hidden bg-gray-200">
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
    accessorKey: 'estimatedCost',
    header: ({ column }) => <SortableHeader column={column}>Budget</SortableHeader>,
    cell: ({ row }) => (
      <div className="text-right">
        <div className="font-mono text-sm">{formatCurrency(row.original.actualCost ?? 0)}</div>
        <div className="text-[10px] text-muted-foreground">of {formatCurrency(row.original.estimatedCost ?? 0)}</div>
      </div>
    ),
  },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useProjects();
  const projects = (data ?? []) as Project[];

  const total = projects.length;
  const active = projects.filter((p) => p.status === 'active').length;
  const onHold = projects.filter((p) => p.status === 'on_hold').length;
  const completed = projects.filter((p) => p.status === 'completed').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Project) => {
      router.push(`/projects/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Projects"
      subtitle="Manage projects, tasks, and timesheets"
      breadcrumbs={[{ label: 'Projects' }]}
      createButton={{ label: 'New Project', href: '/projects/new' }}
      summaryCards={[
        { label: 'Total', value: total },
        { label: 'Active', value: active, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'On Hold', value: onHold, icon: <span className="text-amber-500">&#9679;</span> },
        { label: 'Completed', value: completed, icon: <span className="text-emerald-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        searchPlaceholder="Search projects..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No projects found."
        emptyAction={{
          label: 'Create Project',
          onClick: () => router.push('/projects/new'),
        }}
      />
    </ListPage>
  );
}
