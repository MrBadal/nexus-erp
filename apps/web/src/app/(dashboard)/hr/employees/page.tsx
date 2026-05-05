'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useEmployees, type Employee } from '@/hooks/use-hr';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<Employee['status'], 'success' | 'muted' | 'warning' | 'danger'> = {
  active: 'success',
  inactive: 'muted',
  terminated: 'danger',
  on_leave: 'warning',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'On Leave', value: 'on_leave' },
    ],
  },
  {
    key: 'employmentType',
    label: 'Type',
    type: 'checkbox-group',
    options: [
      { label: 'Full Time', value: 'full_time' },
      { label: 'Part Time', value: 'part_time' },
      { label: 'Contract', value: 'contract' },
      { label: 'Intern', value: 'intern' },
    ],
  },
];

const typeLabels: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  intern: 'Intern',
};

const columns: ColumnDef<Employee, unknown>[] = [
  {
    accessorKey: 'employeeId',
    header: ({ column }) => <SortableHeader column={column}>Emp ID</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/hr/employees/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.employeeId}
      </Link>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => {
      const e = row.original;
      const displayName = e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown';
      return (
        <div>
          <span className="text-sm font-medium">{displayName}</span>
          <div className="text-xs text-muted-foreground">{e.email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => <span className="text-sm">{row.original.department || '\u2014'}</span>,
  },
  {
    accessorKey: 'designation',
    header: 'Designation',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.designation || '\u2014'}</span>,
  },
  {
    accessorKey: 'employmentType',
    header: 'Type',
    cell: ({ row }) => (
      <span className="text-sm">{typeLabels[row.original.employmentType] ?? row.original.employmentType}</span>
    ),
  },
  {
    accessorKey: 'dateOfJoining',
    header: ({ column }) => <SortableHeader column={column}>Joining Date</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{row.original.dateOfJoining ? formatDate(row.original.dateOfJoining) : '\u2014'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status;
      return (
        <StatusDot
          status={statusVariant[s]}
          label={s === 'on_leave' ? 'On Leave' : s.charAt(0).toUpperCase() + s.slice(1)}
        />
      );
    },
  },
];

export default function EmployeesPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useEmployees();
  const employees = data ?? [];

  const total = employees.length;
  const active = employees.filter((e) => e.status === 'active').length;
  const onLeave = employees.filter((e) => e.status === 'on_leave').length;
  const depts = new Set(employees.map((e) => e.department).filter(Boolean)).size;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Employee) => {
      router.push(`/hr/employees/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Employees"
      subtitle="Manage your organization's workforce"
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Employees' },
      ]}
      createButton={{ label: 'Add Employee', href: '/hr/employees/new' }}
      summaryCards={[
        { label: 'Total', value: total },
        { label: 'Active', value: active, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'On Leave', value: onLeave, icon: <span className="text-amber-500">&#9679;</span> },
        { label: 'Departments', value: depts },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={employees}
        isLoading={isLoading}
        searchPlaceholder="Search employees..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No employees found."
        emptyAction={{
          label: 'Add Employee',
          onClick: () => router.push('/hr/employees/new'),
        }}
      />
    </ListPage>
  );
}
