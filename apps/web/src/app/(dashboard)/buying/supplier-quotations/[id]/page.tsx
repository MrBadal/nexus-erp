'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  InlineGrid,
  type InlineGridColumn,
} from '@/components/ui/inline-grid';
import {
  useSupplierQuotation,
  useUpdateSupplierQuotation,
  useDeleteSupplierQuotation,
  useReceiveQuotation,
  useAcceptQuotation,
  useRejectQuotation,
  useSendQuotation,
  useConvertQuotation,
  type SupplierQuotationLine,
} from '@/hooks/use-buying';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<
  string,
  'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'
> = {
  draft: 'default',
  sent: 'info',
  received: 'warning',
  accepted: 'success',
  rejected: 'danger',
};

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  received: 'Received',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

// ---------------------------------------------------------------------------
// Line columns
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
    key: 'qty',
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
    key: 'total',
    header: 'Total',
    type: 'readonly',
    width: '120px',
    align: 'right',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseLines(lines: SupplierQuotationLine[]): LineItem[] {
  if (!lines || lines.length === 0) {
    return [{ description: '', qty: 1, unitPrice: 0, total: 0 }];
  }
  return lines.map((l) => {
    const qty = parseFloat(l.quantity) || 0;
    const unitPrice = parseFloat(l.unitPrice) || 0;
    return {
      description: l.description ?? '',
      qty,
      unitPrice,
      total: qty * unitPrice,
    };
  });
}

function calcLineTotal(line: LineItem): number {
  return line.qty * line.unitPrice;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SupplierQuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quotationId = params.id;

  const { data: quotation, isLoading, error } = useSupplierQuotation(quotationId);
  const updateMutation = useUpdateSupplierQuotation();
  const deleteMutation = useDeleteSupplierQuotation();
  const sendMutation = useSendQuotation();
  const receiveMutation = useReceiveQuotation();
  const acceptMutation = useAcceptQuotation();
  const rejectMutation = useRejectQuotation();
  const convertMutation = useConvertQuotation();

  const [localQuotationDate, setLocalQuotationDate] = useState<Date | null>(null);
  const [localValidUntil, setLocalValidUntil] = useState<Date | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const [localLines, setLocalLines] = useState<LineItem[] | null>(null);

  const status = quotation?.status ?? 'draft';
  const isDraft = status === 'draft';
  const isAccepted = status === 'accepted';
  const isRejected = status === 'rejected';
  const isReadOnly = isAccepted || isRejected;

  const currentQuotationDate = localQuotationDate ?? (quotation?.quotationDate ? new Date(quotation.quotationDate) : new Date());
  const currentValidUntil = localValidUntil ?? (quotation?.validUntil ? new Date(quotation.validUntil) : null);
  const currentNotes = localNotes ?? quotation?.notes ?? '';

  const lines = useMemo(() => {
    if (localLines) return localLines;
    if (quotation?.lines) return parseLines(quotation.lines);
    return [{ description: '', qty: 1, unitPrice: 0, total: 0 }];
  }, [localLines, quotation]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + calcLineTotal(l), 0),
    [lines],
  );

  function handleSave() {
    if (!quotation) return;
    updateMutation.mutate(
      {
        id: quotationId,
        data: {
          quotationDate: currentQuotationDate.toISOString().split('T')[0],
          validUntil: currentValidUntil?.toISOString().split('T')[0] ?? null,
          notes: currentNotes || null,
        },
      },
      {
        onSuccess: () => toast.success('Quotation saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save quotation')),
      },
    );
  }

  function handleSend() {
    sendMutation.mutate(quotationId, {
      onSuccess: () => toast.success('Quotation sent to supplier'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to send quotation')),
    });
  }

  function handleReceive() {
    receiveMutation.mutate(quotationId, {
      onSuccess: () => toast.success('Quotation marked as received'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to receive quotation')),
    });
  }

  function handleAcceptAndCreatePO() {
    acceptMutation.mutate(quotationId, {
      onSuccess: () => {
        convertMutation.mutate(quotationId, {
          onSuccess: () => {
            toast.success('Quotation accepted — Purchase Order created');
            router.push('/buying/purchase-orders');
          },
          onError: () => {
            toast.success('Quotation accepted');
            router.push('/buying/purchase-orders');
          },
        });
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to accept quotation')),
    });
  }

  function handleReject() {
    rejectMutation.mutate(quotationId, {
      onSuccess: () => toast.success('Quotation rejected'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to reject quotation')),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(quotationId, {
      onSuccess: () => {
        toast.success('Quotation deleted');
        router.push('/buying/supplier-quotations');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete quotation')),
    });
  }

  function handleLineChange(updatedLines: LineItem[]) {
    setLocalLines(updatedLines.map((l) => ({ ...l, total: calcLineTotal(l) })));
  }

  function handleAddLine() {
    setLocalLines([...lines, { description: '', qty: 1, unitPrice: 0, total: 0 }]);
  }

  function handleRemoveLine(index: number) {
    setLocalLines(lines.filter((_, i) => i !== index));
  }

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
            onClick={() => router.push('/buying/supplier-quotations')}
          >
            Back to supplier quotations
          </button>
        </div>
      </div>
    );
  }

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
            { label: 'Send to Supplier', onClick: handleSend, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Delete', onClick: handleDelete },
        };
      case 'sent':
        return {
          primaryAction: {
            label: 'Receive Quotation',
            onClick: handleReceive,
            loading: receiveMutation.isPending,
          },
          secondaryActions: [],
        };
      case 'received':
        return {
          primaryAction: {
            label: 'Accept & Create PO',
            onClick: handleAcceptAndCreatePO,
            loading: acceptMutation.isPending || convertMutation.isPending,
          },
          secondaryActions: [],
          dangerAction: { label: 'Reject', onClick: handleReject },
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    { label: 'Quotation #', value: <span className="font-mono">{quotation.quotationNumber}</span> },
    {
      label: 'Supplier',
      value: (
        <Link href={`/buying/suppliers/${quotation.supplierId}`} className="text-primary hover:underline">
          {quotation.supplier}
        </Link>
      ),
    },
    { label: 'Created', value: formatDate(quotation.createdAt) },
    { label: 'Updated', value: formatDate(quotation.updatedAt) },
  ];

  return (
    <FormPage
      title={quotation.quotationNumber}
      breadcrumbs={[
        { label: 'Buying', href: '/buying' },
        { label: 'Supplier Quotations', href: '/buying/supplier-quotations' },
        { label: quotation.quotationNumber },
      ]}
      backHref="/buying/supplier-quotations"
      status={{
        label: statusLabelMap[status] ?? status,
        variant: statusVariantMap[status] ?? 'default',
      }}
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
          <FormField label="Supplier">
            <div className="flex items-center gap-2">
              <Input value={quotation.supplier} readOnly className="bg-muted" />
              <Link
                href={`/buying/suppliers/${quotation.supplierId}`}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                View
              </Link>
            </div>
          </FormField>
          <FormField label="Quotation Date">
            <DatePicker
              value={currentQuotationDate ?? undefined}
              onChange={(d) => setLocalQuotationDate(d)}
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Valid Until">
            <DatePicker
              value={currentValidUntil ?? undefined}
              onChange={(d) => setLocalValidUntil(d)}
              disabled={isReadOnly}
            />
          </FormField>
        </FormSection>

        {/* Line Items */}
        <FormSection title="Line Items" columns={1} collapsible={false}>
          <InlineGrid<LineItem>
            columns={lineColumns}
            rows={lines.map((l) => ({
              ...l,
              total: formatCurrency(calcLineTotal(l)) as unknown as number,
            }))}
            onChange={(rows) => {
              handleLineChange(
                rows.map((r) => ({
                  ...r,
                  total: typeof r.total === 'string' ? 0 : (r.total as number),
                })),
              );
            }}
            onAddRow={handleAddLine}
            onRemoveRow={handleRemoveLine}
            disabled={isReadOnly}
            addRowLabel="+ Add Line"
          />
        </FormSection>

        {/* Totals */}
        <div className="flex justify-end">
          <Card className="w-72">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-bold font-mono">{formatCurrency(subtotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes ?? undefined}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Notes or terms from supplier"
              disabled={isReadOnly}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
