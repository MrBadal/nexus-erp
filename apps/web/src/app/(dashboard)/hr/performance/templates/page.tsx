'use client';

import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable } from '@/components/ui/data-table';
import { useKraTemplates, useDeleteKraTemplate, type KraTemplate } from '@/hooks/use-performance';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function KraTemplatesPage() {
  const { data, isLoading } = useKraTemplates();
  const templates = (data as KraTemplate[] | undefined) ?? [];
  const del = useDeleteKraTemplate();

  const columns: ColumnDef<KraTemplate>[] = [
    {
      accessorKey: 'name',
      header: 'Template Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'designationName',
      header: 'Designation',
      cell: ({ row }) => row.original.designationName ?? 'All designations',
    },
    {
      accessorKey: 'kras',
      header: 'KRAs',
      cell: ({ row }) => `${row.original.kras?.length ?? 0} items`,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete template "${row.original.name}"?`)) {
              del.mutate(row.original.id);
            }
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <ListPage
      title="KRA Templates"
      subtitle="Reusable Key Result Area templates per designation"
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Performance', href: '/hr/performance' },
        { label: 'KRA Templates' },
      ]}
      createButton={{ label: 'New Template', href: '/hr/performance/templates/new' }}
    >
      <DataTable
        columns={columns}
        data={templates}
        isLoading={isLoading}
        emptyMessage="No KRA templates yet. Create one to standardize KRA assignment for designations."
      />
    </ListPage>
  );
}
