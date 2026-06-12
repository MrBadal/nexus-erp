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
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePurchaseReceipt,
  useUpdatePurchaseReceipt,
  useSubmitReceipt,
  useCompleteReceipt,
  type PurchaseReceiptItem,
} from '@/hooks/use-buying';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReceiptLineItem {
  description: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  draft: 'default',
  submitted: 'info',
  completed: 'success',
};

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  completed: 'Completed',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseItems(items: PurchaseReceiptItem[]): ReceiptLineItem[] {
  if (!items || items.length === 0) {
    return [{ description: '', orderedQty: 0, receivedQty: 0, unitPrice: 0, total: 0 }];
  }
  return items.map((item) => {
    const receivedQty = parseFloat(item.receivedQty) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    return {
      description: item.description ?? '',
      orderedQty: parseFloat(item.orderedQty) || 0,
      receivedQty,
      unitPrice,
      total: receivedQty * unitPrice,
    };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PurchaseReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const receiptId = params.id;

  const { data: receipt, isLoading, error } = usePurchaseReceipt(receiptId);
  const updateMutation = useUpdatePurchaseReceipt();
  const submitMutation = useSubmitReceipt();
  const completeMutation = useCompleteReceipt();

  const [localReceiptDate, setLocalReceiptDate] = useState<Date | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<ReceiptLineItem[] | null>(null);

  const status = receipt?.status ?? 'draft';
  const isDraft = status === 'draft';
  const isCompleted = status === 'completed';

  const currentReceiptDate = localReceiptDate ?? (receipt?.receiptDate ? new Date(receipt.receiptDate) : new Date());
  const currentNotes = localNotes ?? receipt?.notes ?? '';

  const items = useMemo(() => {
    if (localItems) return localItems;
    if (receipt?.items) return parseItems(receipt.items);
    return [{ description: '', orderedQty: 0, receivedQty: 0, unitPrice: 0, total: 0 }];
  }, [localItems, receipt]);

  const grandTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.receivedQty * item.unitPrice, 0),
    [items],
  );

  function handleSave() {
    if (!receipt) return;
    updateMutation.mutate(
      {
        id: receiptId,
        data: {
          receiptDate: currentReceiptDate.toISOString().split('T')[0],
          notes: currentNotes || null,
        },
      },
      {
        onSuccess: () => toast.success('Receipt saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save receipt')),
      },
    );
  }

  function handleSubmit() {
    submitMutation.mutate(receiptId, {
      onSuccess: () => toast.success('Receipt submitted'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to submit receipt')),
    });
  }

  function handleComplete() {
    completeMutation.mutate(receiptId, {
      onSuccess: () => toast.success('Receipt completed — stock updated'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to complete receipt')),
    });
  }

  function handleReceivedQtyChange(index: number, value: number) {
    const updated = items.map((item, i) =>
      i === index
        ? { ...item, receivedQty: value, total: value * item.unitPrice }
        : item,
    );
    setLocalItems(updated);
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

  if (error || !receipt) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading purchase receipt' : 'Purchase receipt not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/buying/purchase-receipts')}
          >
            Back to purchase receipts
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
            { label: 'Submit Receipt', onClick: handleSubmit, variant: 'outline' as const },
          ],
        };
      case 'submitted':
        return {
          primaryAction: {
            label: 'Complete Receipt',
            onClick: handleComplete,
            loading: completeMutation.isPending,
          },
          secondaryActions: [],
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    { label: 'Receipt #', value: <span className="font-mono">{receipt.receiptNumber}</span> },
    {
      label: 'PO #',
      value: (
        <Link href={`/buying/purchase-orders/${receipt.purchaseOrderId}`} className="font-mono text-primary hover:underline">
          {receipt.purchaseOrder}
        </Link>
      ),
    },
    {
      label: 'Supplier',
      value: (
        <Link href={`/buying/suppliers/${receipt.supplierId}`} className="text-primary hover:underline">
          {receipt.supplier}
        </Link>
      ),
    },
    { label: 'Warehouse', value: receipt.warehouse },
    { label: 'Created', value: formatDate(receipt.createdAt) },
  ];

  return (
    <FormPage
      title={receipt.receiptNumber}
      breadcrumbs={[
        { label: 'Buying', href: '/buying' },
        { label: 'Purchase Receipts', href: '/buying/purchase-receipts' },
        { label: receipt.receiptNumber },
      ]}
      backHref="/buying/purchase-receipts"
      status={{
        label: statusLabelMap[status] ?? status,
        variant: statusVariantMap[status] ?? 'default',
      }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Header */}
        <FormSection title="Receipt Details" columns={2}>
          <FormField label="Receipt Number">
            <Input value={receipt.receiptNumber} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Receipt Date">
            <DatePicker
              value={currentReceiptDate}
              onChange={(d) => setLocalReceiptDate(d)}
              disabled={isCompleted}
            />
          </FormField>
          <FormField label="Purchase Order">
            <div className="flex items-center gap-2">
              <Input value={receipt.purchaseOrder} readOnly className="font-mono bg-muted" />
              <Link
                href={`/buying/purchase-orders/${receipt.purchaseOrderId}`}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                View
              </Link>
            </div>
          </FormField>
          <FormField label="Supplier">
            <div className="flex items-center gap-2">
              <Input value={receipt.supplier} readOnly className="bg-muted" />
              <Link
                href={`/buying/suppliers/${receipt.supplierId}`}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                View
              </Link>
            </div>
          </FormField>
        </FormSection>

        {/* Items Received */}
        <FormSection title="Items Received" columns={1} collapsible={false}>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ordered Qty
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Received Qty
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Unit Price
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-3 py-2">{item.description || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{item.orderedQty}</td>
                    <td className="px-3 py-2 text-right">
                      {isCompleted ? (
                        <span className="font-mono">{item.receivedQty}</span>
                      ) : (
                        <Input
                          type="number"
                          value={item.receivedQty}
                          onChange={(e) =>
                            handleReceivedQtyChange(index, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 text-right font-mono h-7 px-2"
                          min={0}
                          max={item.orderedQty}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatCurrency(item.receivedQty * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20">
                <tr className="border-t">
                  <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold">
                    Total
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {formatCurrency(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Notes about this receipt"
              disabled={isCompleted}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
