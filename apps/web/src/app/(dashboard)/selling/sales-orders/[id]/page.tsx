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
  useSalesOrder,
  useUpdateSalesOrder,
  useConfirmSalesOrder,
  useCancelSalesOrder,
  useDeleteSalesOrder,
  useCreateDeliveryNote,
  type SalesOrder,
  type SalesOrderLine,
} from '@/hooks/use-selling';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderStatus = SalesOrder['status'];

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<OrderStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  draft: 'default',
  confirmed: 'info',
  delivered: 'success',
  invoiced: 'success',
  cancelled: 'danger',
};

const statusLabelMap: Record<OrderStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  delivered: 'Delivered',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
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

function parseLinesFromOrder(order: SalesOrder): SalesOrderLine[] {
  if (order.lines && order.lines.length > 0) return order.lines;
  return [{ itemId: '', itemName: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 }];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id;

  const { data: order, isLoading, error } = useSalesOrder(orderId);
  const updateMutation = useUpdateSalesOrder();
  const confirmMutation = useConfirmSalesOrder();
  const cancelMutation = useCancelSalesOrder();
  const deleteMutation = useDeleteSalesOrder();
  const createDNMutation = useCreateDeliveryNote();

  // Local editable state
  const [localOrderDate, setLocalOrderDate] = useState<string | null>(null);
  const [localDeliveryDate, setLocalDeliveryDate] = useState<string | null>(null);
  const [localShippingAddress, setLocalShippingAddress] = useState<string | null>(null);
  const [localShippingMethod, setLocalShippingMethod] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const [localLines, setLocalLines] = useState<SalesOrderLine[] | null>(null);

  // Derived current values
  const status = order?.status ?? 'draft';
  const isDraft = status === 'draft';
  const isConfirmed = status === 'confirmed';
  const isDelivered = status === 'delivered';

  const currentOrderDate = localOrderDate ?? order?.orderDate ?? '';
  const currentDeliveryDate = localDeliveryDate ?? order?.deliveryDate ?? '';
  const currentShippingAddress = localShippingAddress ?? '';
  const currentShippingMethod = localShippingMethod ?? '';
  const currentNotes = localNotes ?? order?.notes ?? '';
  const customerName = order?.customer ?? order?.customerName ?? order?.customerId ?? '';

  const lines = useMemo<SalesOrderLine[]>(() => {
    if (localLines) return localLines;
    if (order) return parseLinesFromOrder(order);
    return [{ itemId: '', itemName: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0, lineTotal: 0 }];
  }, [localLines, order]);

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
    if (!order) return;
    updateMutation.mutate(
      {
        id: orderId,
        data: {
          orderDate: currentOrderDate || undefined,
          deliveryDate: currentDeliveryDate || undefined,
          notes: currentNotes,
        },
      },
      {
        onSuccess: () => toast.success('Sales order saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save sales order')),
      },
    );
  }

  function handleConfirm() {
    confirmMutation.mutate(orderId, {
      onSuccess: () => toast.success('Sales order confirmed'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to confirm sales order')),
    });
  }

  function handleCancel() {
    if (!confirm('Cancel this sales order?')) return;
    cancelMutation.mutate(orderId, {
      onSuccess: () => toast.success('Sales order cancelled'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to cancel sales order')),
    });
  }

  function handleDelete() {
    if (!confirm('Delete this sales order? This action cannot be undone.')) return;
    deleteMutation.mutate(orderId, {
      onSuccess: () => {
        toast.success('Sales order deleted');
        router.push('/selling/sales-orders');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete sales order')),
    });
  }

  function handleCreateDeliveryNote() {
    if (!order) return;
    createDNMutation.mutate(
      { salesOrderId: orderId, customerId: order.customerId },
      {
        onSuccess: () => toast.success('Delivery note created'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create delivery note')),
      },
    );
  }

  function handleCreateInvoice() {
    router.push(`/finance/invoices/new?soId=${orderId}`);
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

  if (error || !order) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading sales order' : 'Sales order not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/selling/sales-orders')}
          >
            Back to sales orders
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
            { label: 'Submit for Approval', onClick: handleConfirm, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Delete', onClick: handleDelete },
        };
      case 'confirmed':
        return {
          primaryAction: {
            label: 'Create Delivery Note',
            onClick: handleCreateDeliveryNote,
            loading: createDNMutation.isPending,
          },
          secondaryActions: [
            { label: 'Create Invoice', onClick: handleCreateInvoice, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Cancel', onClick: handleCancel },
        };
      case 'delivered':
        return {
          primaryAction: { label: 'Create Invoice', onClick: handleCreateInvoice },
          secondaryActions: [],
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    { label: 'Order #', value: <span className="font-mono text-sm">{order.orderNumber}</span> },
    { label: 'Customer', value: <Link href={`/selling/customers/${order.customerId}`} className="text-primary underline">{customerName}</Link> },
    { label: 'Created', value: formatDate(order.createdAt) },
    { label: 'Last Updated', value: formatDate(order.updatedAt) },
  ];

  return (
    <FormPage
      title={order.orderNumber}
      breadcrumbs={[
        { label: 'Selling', href: '/selling' },
        { label: 'Sales Orders', href: '/selling/sales-orders' },
        { label: order.orderNumber },
      ]}
      backHref="/selling/sales-orders"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      dangerAction={actions.dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Header */}
        <FormSection title="Order Details" columns={2}>
          <FormField label="Order Number">
            <Input value={order.orderNumber} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Customer">
            <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
              <Link href={`/selling/customers/${order.customerId}`} className="text-primary underline">
                {customerName}
              </Link>
            </div>
          </FormField>
          <FormField label="Order Date">
            <Input
              type="date"
              value={currentOrderDate}
              onChange={(e) => setLocalOrderDate(e.target.value)}
              disabled={!isDraft}
            />
          </FormField>
          <FormField label="Delivery Date">
            <Input
              type="date"
              value={currentDeliveryDate ?? ''}
              onChange={(e) => setLocalDeliveryDate(e.target.value)}
              disabled={!isDraft}
            />
          </FormField>
        </FormSection>

        {/* Shipping */}
        <FormSection title="Shipping" columns={2}>
          <FormField label="Shipping Address">
            <Textarea
              value={currentShippingAddress}
              onChange={(e) => setLocalShippingAddress(e.target.value)}
              placeholder="Shipping address"
              disabled={!isDraft}
              rows={3}
            />
          </FormField>
          <FormField label="Shipping Method">
            <Input
              value={currentShippingMethod}
              onChange={(e) => setLocalShippingMethod(e.target.value)}
              placeholder="e.g. FedEx, UPS, DHL"
              disabled={!isDraft}
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
              placeholder="Order notes"
              disabled={status === 'cancelled'}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
