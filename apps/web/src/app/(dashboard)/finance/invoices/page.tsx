'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, FileText, CheckCircle, Clock } from 'lucide-react';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types (aligned with use-invoices hook Invoice type, but demo data here)
// ---------------------------------------------------------------------------

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  issueDate: string;
  dueDate: string;
  total: number;
  balanceDue: number;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'void';
  currencyCode: string;
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

const statusVariantMap: Record<InvoiceRow['status'], 'default' | 'info' | 'warning' | 'success' | 'danger' | 'muted'> = {
  draft: 'default',
  sent: 'info',
  partially_paid: 'warning',
  paid: 'success',
  overdue: 'danger',
  void: 'muted',
};

const statusLabelMap: Record<InvoiceRow['status'], string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
};

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const demoInvoices: InvoiceRow[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-0138',
    customerName: 'Acme Corporation',
    issueDate: '2024-01-05',
    dueDate: '2024-02-04',
    total: 16350.0,
    balanceDue: 0,
    status: 'paid',
    currencyCode: 'USD',
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-0139',
    customerName: 'TechStart Inc.',
    issueDate: '2024-01-10',
    dueDate: '2024-02-09',
    total: 9265.0,
    balanceDue: 9265.0,
    status: 'sent',
    currencyCode: 'USD',
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-0140',
    customerName: 'Global Solutions Ltd.',
    issueDate: '2023-12-01',
    dueDate: '2023-12-31',
    total: 23980.0,
    balanceDue: 23980.0,
    status: 'overdue',
    currencyCode: 'USD',
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-0141',
    customerName: 'Bright Media Co.',
    issueDate: '2024-01-12',
    dueDate: '2024-02-11',
    total: 13080.0,
    balanceDue: 6540.0,
    status: 'partially_paid',
    currencyCode: 'USD',
  },
  {
    id: '5',
    invoiceNumber: 'INV-2024-0142',
    customerName: null,
    issueDate: '2024-01-19',
    dueDate: '2024-02-18',
    total: 4905.0,
    balanceDue: 4905.0,
    status: 'draft',
    currencyCode: 'USD',
  },
  {
    id: '6',
    invoiceNumber: 'INV-2024-0143',
    customerName: 'Summit Partners',
    issueDate: '2024-01-20',
    dueDate: '2024-02-19',
    total: 7200.0,
    balanceDue: 0,
    status: 'void',
    currencyCode: 'USD',
  },
];

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

function isOverdue(row: InvoiceRow): boolean {
  return (
    row.status === 'overdue' ||
    (row.status !== 'paid' &&
      row.status !== 'void' &&
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
        {formatCurrency(row.original.total, row.original.currencyCode)}
      </span>
    ),
  },
  {
    accessorKey: 'balanceDue',
    header: 'Outstanding',
    cell: ({ row }) => {
      const overdue = isOverdue(row.original);
      const due = row.original.balanceDue;
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

  // Compute filtered data
  const filteredData = useMemo(() => {
    let data = demoInvoices;
    const statusFilter = filterValues.status as string[] | undefined;
    if (statusFilter && statusFilter.length > 0) {
      data = data.filter((inv) => statusFilter.includes(inv.status));
    }
    return data;
  }, [filterValues]);

  // Summary calculations
  const totalOutstanding = useMemo(() => {
    return demoInvoices
      .filter((inv) => inv.status !== 'paid' && inv.status !== 'void')
      .reduce((sum, inv) => sum + inv.balanceDue, 0);
  }, []);

  const overdueInvoices = useMemo(() => {
    return demoInvoices.filter((inv) => inv.status === 'overdue');
  }, []);

  const overdueAmount = useMemo(() => {
    return overdueInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  }, [overdueInvoices]);

  const paidThisMonthCount = useMemo(() => {
    return demoInvoices.filter((inv) => inv.status === 'paid').length;
  }, []);

  const draftCount = useMemo(() => {
    return demoInvoices.filter((inv) => inv.status === 'draft').length;
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
          value: `${overdueInvoices.length} (${formatCurrency(overdueAmount)})`,
          icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
        },
        {
          label: 'Paid This Month',
          value: paidThisMonthCount,
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
      onFilterChange={(key, value) =>
        setFilterValues((prev) => ({ ...prev, [key]: value }))
      }
      onFilterClear={() => setFilterValues({})}
    >
      <DataTable
        columns={columns}
        data={filteredData}
        onRowClick={(row) => router.push(`/finance/invoices/${row.id}`)}
        searchPlaceholder="Search invoices..."
        emptyMessage="No invoices found."
      />
    </ListPage>
  );
}
