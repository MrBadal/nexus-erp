'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useCustomers, type Customer } from '@/hooks/use-selling';
import { formatCurrency } from '@/lib/utils';

const statusVariant: Record<Customer['status'], 'success' | 'muted' | 'danger'> = {
  active: 'success',
  inactive: 'muted',
  blocked: 'danger',
};

const typeVariant: Record<Customer['customerType'], 'info' | 'default'> = {
  company: 'info',
  individual: 'default',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Blocked', value: 'blocked' },
    ],
  },
  {
    key: 'customerType',
    label: 'Type',
    type: 'checkbox-group',
    options: [
      { label: 'Company', value: 'company' },
      { label: 'Individual', value: 'individual' },
    ],
  },
];

const columns: ColumnDef<Customer, unknown>[] = [
  {
    accessorKey: 'customerNumber',
    header: ({ column }) => <SortableHeader column={column}>Customer #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/selling/customers/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.customerNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'customerType',
    header: 'Type',
    cell: ({ row }) => (
      <StatusDot
        status={typeVariant[row.original.customerType]}
        label={row.original.customerType === 'company' ? 'Company' : 'Individual'}
      />
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.phone}</span>,
  },
  {
    accessorKey: 'outstandingBalance',
    header: ({ column }) => <SortableHeader column={column}>Outstanding</SortableHeader>,
    cell: ({ row }) => {
      const bal = row.original.outstandingBalance;
      return (
        <span className={`font-mono text-sm ${bal > 0 ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
          {bal > 0 ? formatCurrency(bal) : '\u2014'}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusDot
        status={statusVariant[row.original.status]}
        label={row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      />
    ),
  },
];

export default function CustomersPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const statusFilter = filterValues.status as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
  };

  const { data, isLoading } = useCustomers(apiFilters);
  const customers = data ?? [];

  const total = customers.length;
  const active = customers.filter((c) => c.status === 'active').length;
  const companies = customers.filter((c) => c.customerType === 'company').length;
  const individuals = customers.filter((c) => c.customerType === 'individual').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Customer) => {
      router.push(`/selling/customers/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Customers"
      subtitle="Manage your customer accounts"
      breadcrumbs={[
        { label: 'Selling', href: '/selling' },
        { label: 'Customers' },
      ]}
      createButton={{ label: 'New Customer', href: '/selling/customers/new' }}
      summaryCards={[
        { label: 'Total Customers', value: total },
        { label: 'Active', value: active, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Companies', value: companies, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Individuals', value: individuals, icon: <span className="text-purple-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        searchPlaceholder="Search customers..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No customers found."
        emptyAction={{
          label: 'Add Customer',
          onClick: () => router.push('/selling/customers/new'),
        }}
      />
    </ListPage>
  );
}
