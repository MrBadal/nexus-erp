'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  useQuotation,
  useUpdateQuotation,
  useDeleteQuotation,
  useSendQuotation,
  useAcceptQuotation,
  useRejectQuotation,
  useConvertQuotation,
  type Quotation,
  type SalesOrderLine,
} from '@/hooks/use-selling';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuotationStatus = Quotation['status'];

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<QuotationStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'muted',
};

const statusLabelMap: Record<QuotationStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcLineTotal(line: SalesOrderLine): number {
  const base = line.quantity * line.unitPrice;
  const afterDiscount = base * (1 - (line.discount ?? 0) / 100);
  const withTax = afterDiscount * (1 + (line.taxRate ?? 0) / 100);
  return withTax;
}

function parseLinesFromQuotation(q: Quotation): SalesOrderLine[] {
  if (q.lines && q.lines.length > 0) return q.lines;
  return [{ itemId: '', itemName: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 }];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quotationId = params.id;

  const { data: quotation, isLoading, error } = useQuotation(quotationId);
  const updateMutation = useUpdateQuotation();
  const deleteMutation = useDeleteQuotation();
  const sendMutation = useSendQuotation();
  const acceptMutation = useAcceptQuotation();
  const rejectMutation = useRejectQuotation();
  const convertMutation = useConvertQuotation();

  // Local editable state
  const [localQuotationDate, setLocalQuotationDate] = useState<string | null>(null);
  const [localValidUntil, setLocalValidUntil] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const [localLines, setLocalLines] = useState<SalesOrderLine[] | null>(null);

  // Derived values
  const status = quotation?.status ?? 'draft';
  const isDraft = status === 'draft';
  const isAccepted = status === 'accepted';
  const isReadOnly = status === 'rejected' || status === 'expired';

  const currentQuotationDate = localQuotationDate ?? quotation?.quotationDate ?? '';
  const currentValidUntil = localValidUntil ?? quotation?.validUntil ?? '';
  const currentNotes = localNotes ?? quotation?.notes ?? '';
  const customerName = quotation?.customer ?? quotation?.customerName ?? quotation?.customerId ?? '';

  const lines = useMemo<SalesOrderLine[]>(() => {
    if (localLines) return localLines;
    if (quotation) return parseLinesFromQuotation(quotation);
    return [{ itemId: '', itemName: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 }];
  }, [localLines, quotation]);

  // Totals
  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0), [lines]);
  const discountTotal = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.unitPrice * ((l.discount ?? 0) / 100), 0),
    [lines],
  );
  const taxTotal = useMemo(
    () =>
      lines.reduce((s, l) => {
        const afterDiscount = l.quantity * l.unitPrice * (1 - (l.discount ?? 0) / 100);
        return s + afterDiscount * ((l.taxRate ?? 0) / 100);
      }, 0),
    [lines],
  );
  const grandTotal = subtotal - discountTotal + taxTotal;

  // Handlers
  function handleSave() {
    if (!quotation) return;
    updateMutation.mutate(
      {
        id: quotationId,
        data: {
          quotationDate: currentQuotationDate || undefined,
          validUntil: currentValidUntil || undefined,
          notes: currentNotes,
        },
      },
      {
        onSuccess: () => toast.success('Quotation saved'),
        onError: () => toast.error('Failed to save quotation'),
      },
    );
  }

  function handleSend() {
    sendMutation.mutate(quotationId, {
      onSuccess: () => toast.success('Quotation sent to customer'),
      onError: () => toast.error('Failed to send quotation'),
    });
  }

  function handleAccept() {
    acceptMutation.mutate(quotationId, {
      onSuccess: () => toast.success('Quotation accepted'),
      onError: () => toast.error('Failed to accept quotation'),
    });
  }

  function handleReject() {
    if (!confirm('Mark this quotation as rejected?')) return;
    rejectMutation.mutate(quotationId, {
      onSuccess: () => toast.success('Quotation rejected'),
      onError: () => toast.error('Failed to reject quotation'),
    });
  }

  function handleDelete() {
    if (!confirm('Delete this quotation? This action cannot be undone.')) return;
    deleteMutation.mutate(quotationId, {
      onSuccess: () => {
        toast.success('Quotation deleted');
        router.push('/selling/quotations');
      },
      onError: () => toast.error('Failed to delete quotation'),
    });
  }

  function handleConvert() {
    convertMutation.mutate(quotationId, {
      onSuccess: (newOrder) => {
        toast.success('Quotation converted to sales order');
        router.push(`/selling/sales-orders/${newOrder.id}`);
      },
      onError: () => toast.error('Failed to convert quotation'),
    });
  }

  function handleLineItemChange(index: number, field: keyof SalesOrderLine, value: string | number) {
    const updated = lines.map((l, i) => {
      if (i !== index) return l;
      const next = { ...l, [field]: value };
      next.lineTotal = calcLineTotal(next);
      return next;
    });
    setLocalLines(updated);
  }

  function handleAddLine() {
    setLocalLines([
      ...lines,
      { itemId: '', itemName: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 },
    ]);
  }

  function handleRemoveLine(index: number) {
    setLocalLines(lines.filter((_, i) => i !== index));
  }

  // ---------- Loading / Error ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading quotation' : 'Quotation not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/selling/quotations')}
          >
            Back to quotations
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actions ----------

  function getActions() {
    switch (status) {
      case 'draft':
        return {
          primaryAction: { label: 'Save', onClick: handleSave, loading: updateMutation.isPending },
          secondaryActions: [
            { label: 'Send to Customer', onClick: handleSend, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Delete', onClick: handleDelete },
        };
      case 'sent':
        return {
          primaryAction: { label: 'Mark Accepted', onClick: handleAccept, loading: acceptMutation.isPending },
          secondaryActions: [
            { label: 'Save', onClick: handleSave, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Reject', onClick: handleReject },
        };
      case 'accepted':
        return {
          primaryAction: {
            label: 'Convert to Sales Order',
            onClick: handleConvert,
            loading: convertMutation.isPending,
          },
          secondaryActions: [],
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    { label: 'Quotation #', value: <span className="font-mono text-sm">{quotation.quotationNumber}</span> },
    { label: 'Customer', value: <Link href={`/selling/customers/${quotation.customerId}`} className="text-primary underline">{customerName}</Link> },
    { label: 'Created', value: formatDate(quotation.createdAt) },
    { label: 'Last Updated', value: formatDate(quotation.updatedAt) },
  ];

  return (
    <FormPage
      title={quotation.quotationNumber}
      breadcrumbs={[
        { label: 'Selling', href: '/selling' },
        { label: 'Quotations', href: '/selling/quotations' },
        { label: quotation.quotationNumber },
      ]}
      backHref="/selling/quotations"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      dangerAction={actions.dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Header */}
        <FormSection title="Quotation Details" columns={2}>
          <FormField label="Quotation Number">
            <Input value={quotation.quotationNumber} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Customer">
            <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
              <Link href={`/selling/customers/${quotation.customerId}`} className="text-primary underline">
                {customerName}
              </Link>
            </div>
          </FormField>
          <FormField label="Quotation Date">
            <Input
              type="date"
              value={currentQuotationDate}
              onChange={(e) => setLocalQuotationDate(e.target.value)}
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Valid Until">
            <Input
              type="date"
              value={currentValidUntil}
              onChange={(e) => setLocalValidUntil(e.target.value)}
              disabled={isReadOnly}
            />
          </FormField>
        </FormSection>

        {/* Line Items */}
        <FormSection title="Line Items" columns={1} collapsible={false}>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Unit Price</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Disc %</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Tax %</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Line Total</th>
                  {isDraft && <th className="px-3 py-2 w-10" />}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {isDraft ? (
                        <Input
                          value={line.itemName ?? ''}
                          onChange={(e) => handleLineItemChange(index, 'itemName', e.target.value)}
                          placeholder="Item name"
                          className="h-8"
                        />
                      ) : (
                        <span>{line.itemName}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isDraft ? (
                        <Input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                          min={0}
                        />
                      ) : (
                        <span className="block text-right">{line.quantity}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isDraft ? (
                        <Input
                          type="number"
                          value={line.unitPrice}
                          onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                          min={0}
                          step={0.01}
                        />
                      ) : (
                        <span className="block text-right font-mono">{formatCurrency(line.unitPrice)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isDraft ? (
                        <Input
                          type="number"
                          value={line.discount ?? 0}
                          onChange={(e) => handleLineItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                          min={0}
                          max={100}
                        />
                      ) : (
                        <span className="block text-right">{line.discount ?? 0}%</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isDraft ? (
                        <Input
                          type="number"
                          value={line.taxRate ?? 0}
                          onChange={(e) => handleLineItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                          min={0}
                          max={100}
                        />
                      ) : (
                        <span className="block text-right">{line.taxRate ?? 0}%</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatCurrency(calcLineTotal(line))}
                    </td>
                    {isDraft && (
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          className="text-muted-foreground hover:text-destructive text-xs"
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {isDraft && (
              <div className="px-3 py-2 border-t">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="text-sm text-primary hover:underline"
                >
                  + Add Line
                </button>
              </div>
            )}
          </div>
        </FormSection>

        {/* Totals */}
        <div className="flex justify-end">
          <Card className="w-80">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-mono text-destructive">-{formatCurrency(discountTotal)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono">{formatCurrency(taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-semibold">Grand Total</span>
                <span className="text-lg font-bold font-mono">{formatCurrency(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Quotation notes"
              disabled={isReadOnly}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
