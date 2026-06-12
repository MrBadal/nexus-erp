'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useLeads, type Lead } from '@/hooks/use-crm';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  new: 'info',
  contacted: 'warning',
  qualified: 'success',
  unqualified: 'danger',
  converted: 'success',
  lost: 'danger',
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
  const { data, isLoading } = useLeads({ ...filterValues, search: search || undefined });
  const leads = (data as Lead[] | undefined) ?? [];

  const handleSearch = useCallback((value: string) => setSearch(value), []);
  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleFilterClear = useCallback(() => setFilterValues({}), []);

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
