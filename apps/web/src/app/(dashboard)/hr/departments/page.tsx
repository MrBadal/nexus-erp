'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { useDepartments, type Department } from '@/hooks/use-hr';

const columns: ColumnDef<Department, unknown>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => <SortableHeader column={column}>Code</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/hr/departments/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'manager',
    header: 'Manager',
    cell: ({ row }) => <span className="text-sm">{row.original.manager || '\u2014'}</span>,
  },
  {
    accessorKey: 'headcount',
    header: ({ column }) => <SortableHeader column={column}>Headcount</SortableHeader>,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.headcount}</span>,
  },
];

export default function DepartmentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useDepartments();
  const departments = data ?? [];

  const total = departments.length;
  const totalHeadcount = departments.reduce((sum, d) => sum + (d.headcount || 0), 0);

  const handleRowClick = useCallback(
    (row: Department) => {
      router.push(`/hr/departments/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Departments"
      subtitle="Organize your company structure"
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Departments' },
      ]}
      createButton={{ label: 'New Department', href: '/hr/departments/new' }}
      summaryCards={[
        { label: 'Total Departments', value: total },
        { label: 'Total Headcount', value: totalHeadcount },
      ]}
    >
      <DataTable
        columns={columns}
        data={departments}
        isLoading={isLoading}
        searchPlaceholder="Search departments..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No departments found."
        emptyAction={{
          label: 'Create Department',
          onClick: () => router.push('/hr/departments/new'),
        }}
      />
    </ListPage>
  );
}
