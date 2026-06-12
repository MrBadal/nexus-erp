'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  InlineGrid,
  type InlineGridColumn,
} from '@/components/ui/inline-grid';
import { Card, CardContent } from '@/components/ui/card';
import { Timeline, type TimelineEvent } from '@/components/layout/timeline';
import { Skeleton } from '@/components/ui/skeleton';
import { RecordPaymentDialog } from '@/components/finance/record-payment-dialog';
import {
  useInvoice,
  useUpdateInvoice,
  useConfirmInvoice,
  useSendInvoice,
  useVoidInvoice,
  useDeleteInvoice,
  type Invoice,
} from '@/hooks/use-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceStatus = Invoice['status'];

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  amount: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<
  InvoiceStatus,
  'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'
> = {
  draft: 'default',
  sent: 'info',
  partially_paid: 'warning',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'danger',
  void: 'muted',
};

const statusLabelMap: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  void: 'Void',
};

// ---------------------------------------------------------------------------
// Line item columns
// ---------------------------------------------------------------------------

const lineColumns: InlineGridColumn<LineItem>[] = [
  {
    key: 'description',
    header: 'Description',
    type: 'text',
    width: '2fr',
    placeholder: 'Item description',
  },
  {
    key: 'quantity',
    header: 'Qty',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    key: 'unitPrice',
    header: 'Unit Price',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    key: 'discountPercent',
    header: 'Disc %',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    key: 'amount',
    header: 'Amount',
    type: 'readonly',
    width: '120px',
    align: 'right',
  },
];

// ---------------------------------------------------------------------------
// Payment Terms
// ---------------------------------------------------------------------------

const paymentTermsOptions = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_7', label: 'Net 7' },
  { value: 'net_10', label: 'Net 10' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'net_90', label: 'Net 90' },
];

const typeOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' },
  { value: 'proforma', label: 'Proforma' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseLines(invoice: Invoice): LineItem[] {
  if (!invoice.lines || invoice.lines.length === 0) {
    return [
      { description: '', quantity: 1, unitPrice: 0, discountPercent: 0, amount: 0 },
    ];
  }
  return invoice.lines.map((l) => ({
    description: l.description ?? '',
    quantity: parseFloat(l.quantity) || 0,
    unitPrice: parseFloat(l.unitPrice) || 0,
    discountPercent: parseFloat(l.discountAmount) || 0,
    amount: parseFloat(l.amount) || 0,
  }));
}

function calcLineAmount(line: LineItem): number {
  return line.quantity * line.unitPrice * (1 - line.discountPercent / 100);
}

// ---------------------------------------------------------------------------
// Demo payment history
// ---------------------------------------------------------------------------

interface PaymentRecord {
  date: string;
  amount: number;
  method: string;
  reference: string;
}

function getDemoPayments(status: InvoiceStatus): PaymentRecord[] {
  if (status === 'paid') {
    return [
      { date: '2024-01-20', amount: 16350.0, method: 'Bank Transfer', reference: 'TXN-44821' },
    ];
  }
  if (status === 'partially_paid') {
    return [
      { date: '2024-01-18', amount: 6540.0, method: 'Check', reference: 'CHK-1129' },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params.id;

  const { data: invoice, isLoading, error } = useInvoice(invoiceId);
  const updateMutation = useUpdateInvoice();
  const confirmMutation = useConfirmInvoice();
  const sendMutation = useSendInvoice();
  const voidMutation = useVoidInvoice();
  const deleteMutation = useDeleteInvoice();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Local editable state
  const [localType, setLocalType] = useState<string | null>(null);
  const [localIssueDate, setLocalIssueDate] = useState<Date | null>(null);
  const [localDueDate, setLocalDueDate] = useState<Date | null>(null);
  const [localPaymentTerms, setLocalPaymentTerms] = useState<string | null>(null);
  const [localCustomerName, setLocalCustomerName] = useState<string | null>(null);
  const [localBillingAddress, setLocalBillingAddress] = useState<string | null>(null);
  const [localShippingAddress, setLocalShippingAddress] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const [localLines, setLocalLines] = useState<LineItem[] | null>(null);

  // Derived state
  const status = invoice?.status ?? 'draft';
  const isDraft = status === 'draft';
  const isEditable = isDraft;
  const isReadOnly = status === 'paid' || status === 'void';

  const currentType = localType ?? invoice?.type ?? 'standard';
  const currentIssueDate = localIssueDate ?? (invoice?.issueDate ? new Date(invoice.issueDate) : new Date());
  const currentDueDate = localDueDate ?? (invoice?.dueDate ? new Date(invoice.dueDate) : new Date());
  const currentPaymentTerms = localPaymentTerms ?? invoice?.paymentTerms ?? 'net_30';
  const currentCustomerName = localCustomerName ?? '';
  const currentBillingAddress = localBillingAddress ?? '';
  const currentShippingAddress = localShippingAddress ?? '';
  const currentNotes = localNotes ?? invoice?.notes ?? '';

  const lines = useMemo(() => {
    if (localLines) return localLines;
    if (invoice) return parseLines(invoice);
    return [{ description: '', quantity: 1, unitPrice: 0, discountPercent: 0, amount: 0 }];
  }, [localLines, invoice]);

  // Totals
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + calcLineAmount(l), 0),
    [lines],
  );
  const discountTotal = parseFloat(invoice?.discountAmount ?? '0');
  const taxTotal = parseFloat(invoice?.taxAmount ?? '0');
  const grandTotal = subtotal - discountTotal + taxTotal;
  const amountPaid = parseFloat(invoice?.amountPaid ?? '0');
  const balanceDue = grandTotal - amountPaid;
  const currencyCode = invoice?.currencyCode ?? 'USD';

  const payments = useMemo(() => getDemoPayments(status), [status]);

  // Timeline events
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!invoice) return [];
    const events: TimelineEvent[] = [
      {
        id: 'created',
        type: 'created',
        description: 'Invoice created',
        user: invoice.createdBy,
        date: invoice.createdAt,
      },
    ];
    if (status !== 'draft') {
      events.push({
        id: 'posted',
        type: 'posted',
        description: 'Invoice confirmed',
        date: invoice.updatedAt,
      });
    }
    if (status === 'sent' || status === 'partially_paid' || status === 'paid') {
      events.push({
        id: 'sent',
        type: 'sent',
        description: 'Invoice sent to customer',
        date: invoice.updatedAt,
      });
    }
    if (status === 'partially_paid' || status === 'paid') {
      events.push({
        id: 'payment',
        type: 'payment',
        description: `Payment of ${formatCurrency(amountPaid, currencyCode)} recorded`,
        date: invoice.updatedAt,
      });
    }
    if (status === 'void') {
      events.push({
        id: 'voided',
        type: 'voided',
        description: 'Invoice voided',
        date: invoice.updatedAt,
      });
    }
    return events;
  }, [invoice, status, amountPaid, currencyCode]);

  // Handlers
  function handleSave() {
    if (!invoice) return;
    updateMutation.mutate(
      {
        id: invoiceId,
        data: {
          type: currentType,
          issueDate: currentIssueDate.toISOString().split('T')[0],
          dueDate: currentDueDate.toISOString().split('T')[0],
          paymentTerms: currentPaymentTerms,
          notes: currentNotes,
        },
      },
      {
        onSuccess: () => toast.success('Invoice saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save invoice')),
      },
    );
  }

  function handleConfirm() {
    confirmMutation.mutate(invoiceId, {
      onSuccess: () => toast.success('Invoice confirmed'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to confirm invoice')),
    });
  }

  function handleSend() {
    sendMutation.mutate(invoiceId, {
      onSuccess: () => toast.success('Invoice sent'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to send invoice')),
    });
  }

  function handleVoid() {
    voidMutation.mutate(invoiceId, {
      onSuccess: () => {
        toast.success('Invoice voided');
        router.push('/finance/invoices');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to void invoice')),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(invoiceId, {
      onSuccess: () => {
        toast.success('Invoice deleted');
        router.push('/finance/invoices');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete invoice')),
    });
  }

  function handleLineChange(updatedLines: LineItem[]) {
    const recalculated = updatedLines.map((l) => ({
      ...l,
      amount: calcLineAmount(l),
    }));
    setLocalLines(recalculated);
  }

  function handleAddLine() {
    setLocalLines([
      ...lines,
      { description: '', quantity: 1, unitPrice: 0, discountPercent: 0, amount: 0 },
    ]);
  }

  function handleRemoveLine(index: number) {
    setLocalLines(lines.filter((_, i) => i !== index));
  }

  // ---------- Loading / Error states ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading invoice' : 'Invoice not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/finance/invoices')}
          >
            Back to invoices
          </button>
        </div>
      </div>
    );
  }

  // ---------- Action bar configuration ----------

  function getActions() {
    switch (status) {
      case 'draft':
        return {
          primaryAction: {
            label: 'Save',
            onClick: handleSave,
            loading: updateMutation.isPending,
          },
          secondaryActions: [
            { label: 'Confirm', onClick: handleConfirm, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Delete', onClick: handleDelete },
        };
      case 'sent':
        return {
          primaryAction: {
            label: 'Record Payment',
            onClick: () => setPaymentDialogOpen(true),
          },
          secondaryActions: [
            { label: 'Send', onClick: handleSend, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Void', onClick: handleVoid },
        };
      case 'partially_paid':
        return {
          primaryAction: {
            label: 'Record Payment',
            onClick: () => setPaymentDialogOpen(true),
          },
          dangerAction: { label: 'Void', onClick: handleVoid },
        };
      case 'overdue':
        return {
          primaryAction: {
            label: 'Record Payment',
            onClick: () => setPaymentDialogOpen(true),
          },
          dangerAction: { label: 'Void', onClick: handleVoid },
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  // ---------- Meta sidebar ----------

  const meta = [
    { label: 'Invoice #', value: <span className="font-mono">{invoice.invoiceNumber}</span> },
    { label: 'Type', value: typeOptions.find((o) => o.value === currentType)?.label ?? currentType },
    { label: 'Created by', value: invoice.createdBy ?? 'System' },
    { label: 'Created at', value: formatDate(invoice.createdAt) },
  ];

  if (status !== 'draft') {
    meta.push({ label: 'Confirmed at', value: formatDate(invoice.updatedAt) });
  }
  if (status === 'void') {
    meta.push({ label: 'Voided at', value: formatDate(invoice.updatedAt) });
  }

  // ---------- Render ----------

  return (
    <>
      <FormPage
        title={invoice.invoiceNumber}
        subtitle={
          status === 'void' ? undefined : undefined
        }
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Invoices', href: '/finance/invoices' },
          { label: invoice.invoiceNumber },
        ]}
        backHref="/finance/invoices"
        status={{
          label: status === 'void' ? 'VOID' : statusLabelMap[status],
          variant: statusVariantMap[status],
        }}
        primaryAction={actions.primaryAction}
        secondaryActions={actions.secondaryActions}
        dangerAction={actions.dangerAction}
        meta={meta}
      >
        <div className="space-y-6">
          {/* VOID badge overlay */}
          {status === 'void' && (
            <Badge variant="destructive" className="text-lg px-4 py-1">
              VOID
            </Badge>
          )}

          {/* Invoice Details */}
          <FormSection title="Invoice Details" columns={2}>
            <FormField label="Invoice Number">
              <Input
                value={invoice.invoiceNumber}
                readOnly
                className="font-mono bg-muted"
              />
            </FormField>
            <FormField label="Type">
              <Select
                value={currentType}
                onValueChange={(v) => setLocalType(v)}
                disabled={!isEditable}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Issue Date">
              <DatePicker
                value={currentIssueDate}
                onChange={(d) => setLocalIssueDate(d)}
                disabled={!isEditable}
              />
            </FormField>
            <FormField label="Due Date">
              <DatePicker
                value={currentDueDate}
                onChange={(d) => setLocalDueDate(d)}
                disabled={!isEditable}
              />
            </FormField>
            <FormField label="Payment Terms">
              <Select
                value={currentPaymentTerms}
                onValueChange={(v) => setLocalPaymentTerms(v)}
                disabled={!isEditable}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentTermsOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Currency">
              <Input value={currencyCode} readOnly className="bg-muted" />
            </FormField>
          </FormSection>

          {/* Customer */}
          <FormSection title="Customer" columns={2}>
            <FormField label="Customer Name">
              <Input
                value={currentCustomerName}
                onChange={(e) => setLocalCustomerName(e.target.value)}
                placeholder="Customer name"
                disabled={!isEditable}
              />
            </FormField>
            <div /> {/* spacer */}
            <FormField label="Billing Address">
              <Textarea
                value={currentBillingAddress}
                onChange={(e) => setLocalBillingAddress(e.target.value)}
                placeholder="Billing address"
                disabled={!isEditable}
                rows={3}
              />
            </FormField>
            <FormField label="Shipping Address">
              <Textarea
                value={currentShippingAddress}
                onChange={(e) => setLocalShippingAddress(e.target.value)}
                placeholder="Shipping address"
                disabled={!isEditable}
                rows={3}
              />
            </FormField>
          </FormSection>

          {/* Line Items */}
          <FormSection title="Line Items" columns={1} collapsible={false}>
            <InlineGrid<LineItem>
              columns={lineColumns}
              rows={lines.map((l) => ({
                ...l,
                amount: formatCurrency(calcLineAmount(l), currencyCode) as unknown as number,
              }))}
              onChange={(rows) => {
                handleLineChange(
                  rows.map((r) => ({
                    ...r,
                    amount: typeof r.amount === 'string' ? 0 : (r.amount as number),
                  })),
                );
              }}
              onAddRow={handleAddLine}
              onRemoveRow={handleRemoveLine}
              disabled={!isEditable}
              addRowLabel="+ Add Line"
            />
          </FormSection>

          {/* Totals */}
          <div className="flex justify-end">
            <Card className="w-80">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal, currencyCode)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono text-destructive">
                      -{formatCurrency(discountTotal, currencyCode)}
                    </span>
                  </div>
                )}
                {taxTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-mono">{formatCurrency(taxTotal, currencyCode)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Grand Total</span>
                  <span className="text-lg font-bold font-mono">
                    {formatCurrency(grandTotal, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-mono">{formatCurrency(amountPaid, currencyCode)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Balance Due</span>
                  <span
                    className={`text-lg font-bold font-mono ${
                      balanceDue > 0 && (status === 'overdue' || new Date(invoice.dueDate) < new Date())
                        ? 'text-destructive'
                        : ''
                    }`}
                  >
                    {formatCurrency(balanceDue, currencyCode)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <FormSection title="Payment History" columns={1} collapsible={false}>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Date
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Method
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2">{formatDate(p.date)}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(p.amount, currencyCode)}
                        </td>
                        <td className="px-3 py-2">{p.method}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {p.reference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FormSection>
          )}

          {/* Notes */}
          <FormSection title="Notes" columns={1}>
            <FormField label="Notes">
              <Textarea
                value={currentNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                placeholder="Internal notes"
                disabled={isReadOnly}
                rows={3}
              />
            </FormField>
            <FormField label="Customer Notes">
              <Textarea
                placeholder="Notes visible to customer"
                disabled={isReadOnly}
                rows={3}
              />
            </FormField>
            <FormField label="Terms & Conditions">
              <Textarea
                placeholder="Terms and conditions"
                disabled={isReadOnly}
                rows={3}
              />
            </FormField>
          </FormSection>

          {/* Timeline */}
          {timelineEvents.length > 0 && (
            <FormSection title="Activity" columns={1} collapsible={false}>
              <Timeline events={timelineEvents} />
            </FormSection>
          )}
        </div>
      </FormPage>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        invoiceId={invoiceId}
        balanceDue={balanceDue}
        currency={currencyCode}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={() => {
          // Refetch handled by the hook's invalidation
        }}
      />
    </>
  );
}
