'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import {
  useJournalEntries,
  usePostJournalEntry,
  type JournalEntry,
} from '@/hooks/use-journal-entries';
import { formatCurrency, formatDate, truncate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<
  JournalEntry['status'],
  'warning' | 'success' | 'muted'
> = {
  draft: 'warning',
  posted: 'success',
  reversed: 'muted',
};

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Posted', value: 'posted' },
      { label: 'Reversed', value: 'reversed' },
    ],
  },
  {
    key: 'dateRange',
    label: 'Date Range',
    type: 'date-range',
  },
];

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<JournalEntry, unknown>[] = [
  {
    accessorKey: 'entryNumber',
    header: ({ column }) => <SortableHeader column={column}>Entry #</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/finance/journal-entries/${row.original.id}`}
        className="font-mono text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.entryNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'date',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm">{formatDate(row.original.date)}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.description ? truncate(row.original.description, 50) : '\u2014'}
      </span>
    ),
  },
  {
    accessorKey: 'totalDebit',
    header: ({ column }) => <SortableHeader column={column}>Total Amount</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatCurrency(parseFloat(row.original.totalDebit))}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <StatusDot
          status={statusVariantMap[status]}
          label={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      );
    },
  },
  {
    accessorKey: 'createdBy',
    header: 'Created By',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.createdBy}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function JournalEntriesPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  // Build API filters from filter sidebar state
  const statusFilter = filterValues.status as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
  };

  const { data, isLoading } = useJournalEntries(apiFilters);
  const postMutation = usePostJournalEntry();

  const entries = data ?? [];

  // Compute summary counts
  const totalCount = entries.length;
  const postedCount = entries.filter((e) => e.status === 'posted').length;
  const draftCount = entries.filter((e) => e.status === 'draft').length;
  const reversedCount = entries.filter((e) => e.status === 'reversed').length;

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: JournalEntry) => {
      router.push(`/finance/journal-entries/${row.id}`);
    },
    [router],
  );

  const handleBulkPost = useCallback(
    async (rows: JournalEntry[]) => {
      const drafts = rows.filter((r) => r.status === 'draft');
      if (drafts.length === 0) {
        toast.error('No draft entries selected');
        return;
      }
      try {
        await Promise.all(drafts.map((d) => postMutation.mutateAsync(d.id)));
        toast.success(`Posted ${drafts.length} journal ${drafts.length === 1 ? 'entry' : 'entries'}`);
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Failed to post some entries'));
      }
    },
    [postMutation],
  );

  return (
    <ListPage
      title="Journal Entries"
      subtitle="Create and manage general ledger journal entries"
      breadcrumbs={[
        { label: 'Finance', href: '/finance' },
        { label: 'Journal Entries' },
      ]}
      createButton={{ label: 'New Entry', href: '/finance/journal-entries/new' }}
      summaryCards={[
        { label: 'Total Entries', value: totalCount },
        { label: 'Posted', value: postedCount, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Draft', value: draftCount, icon: <span className="text-amber-500">&#9679;</span> },
        { label: 'Reversed', value: reversedCount, icon: <span className="text-muted-foreground">&#9679;</span> },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={entries}
        isLoading={isLoading}
        enableSelection
        bulkActions={[
          {
            label: 'Post Selected',
            icon: <Check className="h-3.5 w-3.5" />,
            onClick: handleBulkPost,
          },
        ]}
        searchPlaceholder="Search journal entries..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No journal entries found."
        emptyAction={{
          label: 'Create Entry',
          onClick: () => router.push('/finance/journal-entries/new'),
        }}
      />
    </ListPage>
  );
}
