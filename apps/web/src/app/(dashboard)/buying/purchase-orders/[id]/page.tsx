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
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  InlineGrid,
  type InlineGridColumn,
} from '@/components/ui/inline-grid';
import {
  usePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
  useSubmitPO,
  useApprovePO,
  useCancelPO,
  useAmendPO,
  useRecordAdvance,
  usePOAmendmentHistory,
  type PurchaseOrderLine,
} from '@/hooks/use-buying';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineItem {
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
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
  submitted: 'warning',
  approved: 'info',
  received: 'success',
  partially_received: 'warning',
  cancelled: 'danger',
};

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  received: 'Received',
  partially_received: 'Partially Received',
  cancelled: 'Cancelled',
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
    key: 'discount',
    header: 'Disc %',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    key: 'taxRate',
    header: 'Tax %',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    key: 'lineTotal',
    header: 'Total',
    type: 'readonly',
    width: '120px',
    align: 'right',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseLines(lines: PurchaseOrderLine[]): LineItem[] {
  if (!lines || lines.length === 0) {
    return [{ description: '', qty: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 }];
  }
  return lines.map((l) => {
    const qty = parseFloat(l.quantity) || 0;
    const unitPrice = parseFloat(l.unitPrice) || 0;
    const discount = parseFloat(l.discount) || 0;
    const taxRate = parseFloat(l.taxRate) || 0;
    const lineTotal = qty * unitPrice * (1 - discount / 100) * (1 + taxRate / 100);
    return {
      description: l.description ?? '',
      qty,
      unitPrice,
      discount,
      taxRate,
      lineTotal,
    };
  });
}

function calcLineTotal(line: LineItem): number {
  return line.qty * line.unitPrice * (1 - line.discount / 100) * (1 + line.taxRate / 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const poId = params.id;

  const { data: po, isLoading, error } = usePurchaseOrder(poId);
  const updateMutation = useUpdatePurchaseOrder();
  const deleteMutation = useDeletePurchaseOrder();
  const submitMutation = useSubmitPO();
  const approveMutation = useApprovePO();
  const cancelMutation = useCancelPO();
  const amendPO = useAmendPO();

  const [localOrderDate, setLocalOrderDate] = useState<Date | null>(null);
  const [localExpectedDelivery, setLocalExpectedDelivery] = useState<Date | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const [localLines, setLocalLines] = useState<LineItem[] | null>(null);

  const status = po?.status ?? 'draft';
  const isDraft = status === 'draft';
  const isEditable = isDraft;
  const isReadOnly = status === 'received' || status === 'cancelled';

  const currentOrderDate = localOrderDate ?? (po?.orderDate ? new Date(po.orderDate) : new Date());
  const currentExpectedDelivery = localExpectedDelivery ?? (po?.expectedDelivery ? new Date(po.expectedDelivery) : null);
  const currentNotes = localNotes ?? po?.notes ?? '';

  const lines = useMemo(() => {
    if (localLines) return localLines;
    if (po?.lines) return parseLines(po.lines);
    return [{ description: '', qty: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 }];
  }, [localLines, po]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.qty * l.unitPrice * (1 - l.discount / 100), 0),
    [lines],
  );
  const discountTotal = parseFloat(po?.discountAmount ?? '0');
  const taxTotal = parseFloat(po?.taxAmount ?? '0');
  const grandTotal = subtotal + taxTotal - discountTotal;

  function handleSave() {
    if (!po) return;
    updateMutation.mutate(
      {
        id: poId,
        data: {
          orderDate: currentOrderDate.toISOString().split('T')[0],
          expectedDelivery: currentExpectedDelivery?.toISOString().split('T')[0] ?? null,
          notes: currentNotes || null,
        },
      },
      {
        onSuccess: () => toast.success('Purchase order saved'),
        onError: () => toast.error('Failed to save purchase order'),
      },
    );
  }

  function handleSubmit() {
    submitMutation.mutate(poId, {
      onSuccess: () => toast.success('Purchase order submitted for approval'),
      onError: () => toast.error('Failed to submit purchase order'),
    });
  }

  function handleApprove() {
    approveMutation.mutate(poId, {
      onSuccess: () => toast.success('Purchase order approved'),
      onError: () => toast.error('Failed to approve purchase order'),
    });
  }

  function handleReject() {
    cancelMutation.mutate(poId, {
      onSuccess: () => toast.success('Purchase order rejected'),
      onError: () => toast.error('Failed to reject purchase order'),
    });
  }

  function handleCreateReceipt() {
    toast.success('Purchase receipt creation initiated — redirect to new receipt');
    router.push('/buying/purchase-receipts/new');
  }

  function handleCancel() {
    cancelMutation.mutate(poId, {
      onSuccess: () => toast.success('Purchase order cancelled'),
      onError: () => toast.error('Failed to cancel purchase order'),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(poId, {
      onSuccess: () => {
        toast.success('Purchase order deleted');
        router.push('/buying/purchase-orders');
      },
      onError: () => toast.error('Failed to delete purchase order'),
    });
  }

  function handleLineChange(updatedLines: LineItem[]) {
    setLocalLines(
      updatedLines.map((l) => ({ ...l, lineTotal: calcLineTotal(l) })),
    );
  }

  function handleAddLine() {
    setLocalLines([...lines, { description: '', qty: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 }]);
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

  if (error || !po) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading purchase order' : 'Purchase order not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/buying/purchase-orders')}
          >
            Back to purchase orders
          </button>
        </div>
      </div>
    );
  }

  // Action configuration based on status
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
            { label: 'Submit for Approval', onClick: handleSubmit, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Delete', onClick: handleDelete },
        };
      case 'submitted':
        return {
          primaryAction: { label: 'Approve', onClick: handleApprove, loading: approveMutation.isPending },
          secondaryActions: [],
          dangerAction: { label: 'Reject', onClick: handleReject },
        };
      case 'approved':
      case 'partially_received':
        return {
          primaryAction: { label: 'Create Purchase Receipt', onClick: handleCreateReceipt },
          secondaryActions: [
            { label: 'Create Bill', onClick: () => router.push(`/finance/invoices/new?poId=${poId}`), variant: 'outline' as const },
            {
              label: 'Amend PO',
              onClick: () => {
                const reason = prompt('Amendment reason:');
                if (reason) amendPO.mutate({ id: poId, reason }, {
                  onSuccess: () => toast.success('PO amended'),
                  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed'),
                });
              },
              variant: 'outline' as const,
            },
          ],
          dangerAction: { label: 'Cancel', onClick: handleCancel },
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    { label: 'PO #', value: (
      <span className="flex items-center gap-2">
        <span className="font-mono">{po.orderNumber}</span>
        {po.version > 1 && <Badge variant="outline">v{po.version}</Badge>}
        {po.isPendingApproval && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>}
      </span>
    ) },
    {
      label: 'Supplier',
      value: (
        <Link href={`/buying/suppliers/${po.supplierId}`} className="text-primary hover:underline">
          {po.supplier}
        </Link>
      ),
    },
    { label: 'Created', value: formatDate(po.createdAt) },
    { label: 'Updated', value: formatDate(po.updatedAt) },
  ];

  return (
    <FormPage
      title={po.orderNumber}
      breadcrumbs={[
        { label: 'Buying', href: '/buying' },
        { label: 'Purchase Orders', href: '/buying/purchase-orders' },
        { label: po.orderNumber },
      ]}
      backHref="/buying/purchase-orders"
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
        <FormSection title="Order Details" columns={2}>
          <FormField label="PO Number">
            <Input value={po.orderNumber} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Supplier">
            <div className="flex items-center gap-2">
              <Input value={po.supplier} readOnly className="bg-muted" />
              <Link
                href={`/buying/suppliers/${po.supplierId}`}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                View
              </Link>
            </div>
          </FormField>
          <FormField label="Order Date">
            <DatePicker
              value={currentOrderDate ?? undefined}
              onChange={(d) => setLocalOrderDate(d)}
              disabled={!isEditable}
            />
          </FormField>
          <FormField label="Expected Delivery">
            <DatePicker
              value={currentExpectedDelivery ?? undefined}
              onChange={(d) => setLocalExpectedDelivery(d)}
              disabled={!isEditable}
            />
          </FormField>
        </FormSection>

        {/* Line Items */}
        <FormSection title="Line Items" columns={1} collapsible={false}>
          <InlineGrid<LineItem>
            columns={lineColumns}
            rows={lines.map((l) => ({
              ...l,
              lineTotal: formatCurrency(calcLineTotal(l)) as unknown as number,
            }))}
            onChange={(rows) => {
              handleLineChange(
                rows.map((r) => ({
                  ...r,
                  lineTotal: typeof r.lineTotal === 'string' ? 0 : (r.lineTotal as number),
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
              value={currentNotes ?? undefined}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Internal notes or instructions"
              disabled={isReadOnly}
              rows={3}
            />
          </FormField>
        </FormSection>

        {/* Advance Payment */}
        {(po.status === 'approved' || po.status === 'partially_received') && (
          <Card>
            <CardHeader><CardTitle className="text-base">Advance Payment</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Advance Amount</span>
                <span>{'\u20B9'}{parseFloat(po.advanceAmount || '0').toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Advance Paid</span>
                <span>{'\u20B9'}{parseFloat(po.advancePaid || '0').toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Amendment History */}
        {po.amendedFromId && (
          <Card>
            <CardHeader><CardTitle className="text-base">Amendment History</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">This PO was amended from a previous version.</p>
              <p>Reason: {po.amendmentReason || 'Not specified'}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </FormPage>
  );
}
