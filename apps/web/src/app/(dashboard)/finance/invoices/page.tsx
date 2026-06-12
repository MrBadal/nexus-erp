'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, AlertCircle, FileText, CheckCircle, Clock } from 'lucide-react';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useInvoices, type Invoice } from '@/hooks/use-invoices';
import { useCustomers } from '@/hooks/use-selling';
import { apiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Row model (Invoice + resolved customer name)
// ---------------------------------------------------------------------------

interface InvoiceRow extends Invoice {
  customerName: string | null;
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

const statusVariantMap: Record<Invoice['status'], 'default' | 'info' | 'warning' | 'success' | 'danger' | 'muted'> = {
  draft: 'default',
  sent: 'info',
  partially_paid: 'warning',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'muted',
  void: 'muted',
};

const statusLabelMap: Record<Invoice['status'], string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  void: 'Void',
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

function isOverdue(row: InvoiceRow): boolean {
  return (
    row.status === 'overdue' ||
    (row.status !== 'paid' &&
      row.status !== 'void' &&
      row.status !== 'cancelled' &&
      new Date(row.dueDate) < new Date())
  );
}

const columns: ColumnDef<InvoiceRow, unknown>[] = [
  {
    accessorKey: 'invoiceNumber',
    header: ({ column }) => (
      <SortableHeader column={column}>Invoice #</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium text-primary">
        {row.original.invoiceNumber}
      </span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: ({ column }) => (
      <SortableHeader column={column}>Customer</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.customerName ?? 'Walk-in Customer'}
      </span>
    ),
  },
  {
    accessorKey: 'issueDate',
    header: ({ column }) => (
      <SortableHeader column={column}>Issue Date</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{formatDate(row.original.issueDate)}</span>
    ),
  },
  {
    accessorKey: 'dueDate',
    header: ({ column }) => (
      <SortableHeader column={column}>Due Date</SortableHeader>
    ),
    cell: ({ row }) => {
      const overdue = isOverdue(row.original);
      return (
        <span className={overdue ? 'text-sm text-destructive font-medium' : 'text-sm'}>
          {formatDate(row.original.dueDate)}
        </span>
      );
    },
  },
  {
    accessorKey: 'total',
    header: ({ column }) => (
      <SortableHeader column={column}>Total</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatCurrency(parseFloat(row.original.total), row.original.currencyCode)}
      </span>
    ),
  },
  {
    accessorKey: 'balanceDue',
    header: 'Outstanding',
    cell: ({ row }) => {
      const overdue = isOverdue(row.original);
      const due = parseFloat(row.original.balanceDue);
      return (
        <span
          className={
            due > 0 && overdue
              ? 'font-mono text-sm text-destructive font-medium'
              : 'font-mono text-sm'
          }
        >
          {formatCurrency(due, row.original.currencyCode)}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <StatusDot
          status={statusVariantMap[status]}
          label={statusLabelMap[status]}
        />
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Filter configuration
// ---------------------------------------------------------------------------

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Sent', value: 'sent' },
      { label: 'Partially Paid', value: 'partially_paid' },
      { label: 'Paid', value: 'paid' },
      { label: 'Overdue', value: 'overdue' },
      { label: 'Void', value: 'void' },
    ],
  },
  {
    key: 'dateRange',
    label: 'Date Range',
    type: 'date-range',
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});

  const { data: invoices, isLoading, isError, error } = useInvoices();
  const { data: customers } = useCustomers();

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers ?? []) {
      map.set(c.id, c.name);
    }
    return map;
  }, [customers]);

  const rows: InvoiceRow[] = useMemo(
    () =>
      (invoices ?? []).map((inv) => ({
        ...inv,
        customerName: inv.customerId
          ? customerNameById.get(inv.customerId) ?? null
          : null,
      })),
    [invoices, customerNameById],
  );

  // Apply sidebar filters client-side
  const filteredData = useMemo(() => {
    let data = rows;
    const statusFilter = filterValues.status as string[] | undefined;
    if (statusFilter && statusFilter.length > 0) {
      data = data.filter((inv) => statusFilter.includes(inv.status));
    }
    const dateRange = filterValues.dateRange as
      | { from?: string; to?: string }
      | undefined;
    if (dateRange?.from) {
      data = data.filter((inv) => inv.issueDate >= dateRange.from!);
    }
    if (dateRange?.to) {
      data = data.filter((inv) => inv.issueDate <= dateRange.to!);
    }
    return data;
  }, [rows, filterValues]);

  // Summary calculations (over the full data set, not the filtered view)
  const totalOutstanding = useMemo(
    () =>
      rows
        .filter((inv) => inv.status !== 'paid' && inv.status !== 'void' && inv.status !== 'cancelled')
        .reduce((sum, inv) => sum + parseFloat(inv.balanceDue), 0),
    [rows],
  );

  const overdueRows = useMemo(() => rows.filter(isOverdue), [rows]);

  const overdueAmount = useMemo(
    () => overdueRows.reduce((sum, inv) => sum + parseFloat(inv.balanceDue), 0),
    [overdueRows],
  );

  const paidCount = useMemo(
    () => rows.filter((inv) => inv.status === 'paid').length,
    [rows],
  );

  const draftCount = useMemo(
    () => rows.filter((inv) => inv.status === 'draft').length,
    [rows],
  );

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <ListPage
      title="Invoices"
      subtitle="Create, send, and track customer invoices"
      breadcrumbs={[
        { label: 'Finance', href: '/finance' },
        { label: 'Invoices' },
      ]}
      createButton={{ label: 'New Invoice', href: '/finance/invoices/new' }}
      summaryCards={[
        {
          label: 'Total Outstanding',
          value: formatCurrency(totalOutstanding),
          icon: <FileText className="h-4 w-4" />,
        },
        {
          label: 'Overdue',
          value: `${overdueRows.length} (${formatCurrency(overdueAmount)})`,
          icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
        },
        {
          label: 'Paid',
          value: paidCount,
          icon: <CheckCircle className="h-4 w-4" />,
        },
        {
          label: 'Draft',
          value: draftCount,
          icon: <Clock className="h-4 w-4" />,
        },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={() => setFilterValues({})}
    >
      {isError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{apiErrorMessage(error, 'Failed to load invoices')}</span>
        </div>
      )}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/finance/invoices/${row.id}`)}
        searchPlaceholder="Search invoices..."
        emptyMessage="No invoices found."
        emptyAction={{
          label: 'New Invoice',
          onClick: () => router.push('/finance/invoices/new'),
        }}
      />
    </ListPage>
  );
}
