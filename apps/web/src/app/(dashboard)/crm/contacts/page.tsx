'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useContacts, type Contact } from '@/hooks/use-crm';

const typeVariant: Record<Contact['type'], 'success' | 'info' | 'warning'> = {
  customer: 'success',
  vendor: 'info',
  lead: 'warning',
};

const statusVariant: Record<Contact['status'], 'success' | 'muted'> = {
  active: 'success',
  inactive: 'muted',
};

const sourceLabels: Record<string, string> = {
  website: 'Website',
  referral: 'Referral',
  cold_call: 'Cold Call',
  trade_show: 'Trade Show',
  social_media: 'Social Media',
  other: 'Other',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'type',
    label: 'Type',
    type: 'checkbox-group',
    options: [
      { label: 'Customer', value: 'customer' },
      { label: 'Vendor', value: 'vendor' },
      { label: 'Lead', value: 'lead' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
];

const columns: ColumnDef<Contact, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => {
      const c = row.original;
      const displayName = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown';
      return (
        <div>
          <Link
            href={`/crm/contacts/${c.id}`}
            className="text-sm font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {displayName}
          </Link>
          {c.jobTitle && <div className="text-xs text-muted-foreground">{c.jobTitle}</div>}
        </div>
      );
    },
  },
  {
    accessorKey: 'company',
    header: ({ column }) => <SortableHeader column={column}>Company</SortableHeader>,
    cell: ({ row }) => <span className="text-sm">{row.original.company || '\u2014'}</span>,
  },
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
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email || '\u2014'}</span>,
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.phone || '\u2014'}</span>,
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {sourceLabels[row.original.source] ?? row.original.source ?? '\u2014'}
      </span>
    ),
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
];

export default function ContactsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useContacts();
  const contacts = data ?? [];

  const total = contacts.length;
  const customers = contacts.filter((c) => c.type === 'customer').length;
  const leads = contacts.filter((c) => c.type === 'lead').length;
  const vendors = contacts.filter((c) => c.type === 'vendor').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Contact) => {
      router.push(`/crm/contacts/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Contacts"
      subtitle="Manage customers, vendors, and leads"
      breadcrumbs={[
        { label: 'CRM', href: '/crm' },
        { label: 'Contacts' },
      ]}
      createButton={{ label: 'Add Contact', href: '/crm/contacts/new' }}
      summaryCards={[
        { label: 'Total', value: total },
        { label: 'Customers', value: customers, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Leads', value: leads, icon: <span className="text-amber-500">&#9679;</span> },
        { label: 'Vendors', value: vendors, icon: <span className="text-blue-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={contacts}
        isLoading={isLoading}
        searchPlaceholder="Search contacts..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No contacts found."
        emptyAction={{
          label: 'Add Contact',
          onClick: () => router.push('/crm/contacts/new'),
        }}
      />
    </ListPage>
  );
}
