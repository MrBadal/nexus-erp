'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { Mail, Phone, Globe, MessageSquare } from 'lucide-react';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { formatDate } from '@/lib/utils';
import { useTickets } from '@/hooks/use-helpdesk';

interface Ticket {
  id: string;
  ticketNumber?: string;
  subject?: string;
  contactName?: string;
  contactEmail?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'open' | 'replied' | 'resolved' | 'closed';
  source?: 'email' | 'phone' | 'web' | 'chat';
  assignee?: string;
  slaStatus?: 'on-track' | 'at-risk' | 'breached';
  createdAt?: string;
}

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'muted'> = {
  open: 'info',
  replied: 'warning',
  resolved: 'success',
  closed: 'muted',
};

const priorityVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

const slaColors: Record<string, string> = {
  'on-track': 'text-green-600',
  'at-risk': 'text-amber-600',
  'breached': 'text-red-600',
};

const slaLabels: Record<string, string> = {
  'on-track': 'On Track',
  'at-risk': 'At Risk',
  'breached': 'Breached',
};

const SourceIcon = ({ source }: { source: string }) => {
  switch (source) {
    case 'email': return <Mail className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'phone': return <Phone className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'web': return <Globe className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'chat': return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;
    default: return null;
  }
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Open', value: 'open' },
      { label: 'Replied', value: 'replied' },
      { label: 'Resolved', value: 'resolved' },
      { label: 'Closed', value: 'closed' },
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
      { label: 'Urgent', value: 'urgent' },
    ],
  },
  {
    key: 'source',
    label: 'Source',
    type: 'checkbox-group',
    options: [
      { label: 'Email', value: 'email' },
      { label: 'Phone', value: 'phone' },
      { label: 'Web', value: 'web' },
      { label: 'Chat', value: 'chat' },
    ],
  },
];

const columns: ColumnDef<Ticket, unknown>[] = [
  {
    accessorKey: 'ticketNumber',
    header: ({ column }) => <SortableHeader column={column}>Ticket #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/helpdesk/tickets/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.ticketNumber || '\u2014'}
      </Link>
    ),
  },
  {
    accessorKey: 'subject',
    header: ({ column }) => <SortableHeader column={column}>Subject</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm font-medium max-w-[250px] truncate block">{row.original.subject || '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'contactName',
    header: 'Contact',
    cell: ({ row }) => (
      <div>
        <div className="text-sm">{row.original.contactName || '\u2014'}</div>
        {row.original.contactEmail && (
          <div className="text-xs text-muted-foreground">{row.original.contactEmail}</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const p = row.original.priority || 'medium';
      return <StatusDot status={priorityVariant[p] || 'info'} label={p.charAt(0).toUpperCase() + p.slice(1)} />;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status || 'open';
      return <StatusDot status={statusVariant[s] || 'info'} label={s.charAt(0).toUpperCase() + s.slice(1)} />;
    },
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5" title={row.original.source || ''}>
        <SourceIcon source={row.original.source || ''} />
        <span className="text-xs text-muted-foreground capitalize">{row.original.source || '\u2014'}</span>
      </div>
    ),
  },
  {
    accessorKey: 'assignee',
    header: 'Assignee',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.assignee || '\u2014'}</span>,
  },
  {
    accessorKey: 'slaStatus',
    header: 'SLA',
    cell: ({ row }) => {
      const sla = row.original.slaStatus;
      if (!sla) return <span className="text-xs text-muted-foreground">{'\u2014'}</span>;
      return (
        <span className={`text-xs font-medium ${slaColors[sla] || 'text-gray-600'}`}>
          {slaLabels[sla] || sla}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.createdAt ? formatDate(row.original.createdAt) : '\u2014'}</span>
    ),
  },
];

export default function TicketsPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useTickets();
  const tickets = (data ?? []) as Ticket[];

  const total = tickets.length;
  const open = tickets.filter((t) => t.status === 'open').length;
  const replied = tickets.filter((t) => t.status === 'replied').length;
  const resolved = tickets.filter((t) => t.status === 'resolved').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Ticket) => {
      router.push(`/helpdesk/tickets/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Tickets"
      subtitle="Manage support tickets and track resolution"
      breadcrumbs={[
        { label: 'Helpdesk', href: '/helpdesk' },
        { label: 'Tickets' },
      ]}
      createButton={{ label: 'New Ticket', href: '/helpdesk/tickets/new' }}
      summaryCards={[
        { label: 'Total Tickets', value: total },
        { label: 'Open', value: open, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Replied', value: replied, icon: <span className="text-amber-600">&#9679;</span> },
        { label: 'Resolved', value: resolved, icon: <span className="text-green-600">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={tickets}
        isLoading={isLoading}
        searchPlaceholder="Search tickets..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No tickets found."
        emptyAction={{
          label: 'Create Ticket',
          onClick: () => router.push('/helpdesk/tickets/new'),
        }}
      />
    </ListPage>
  );
}
