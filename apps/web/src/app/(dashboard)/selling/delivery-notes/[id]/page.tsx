'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeliveryNote,
  useUpdateDeliveryNote,
  useDispatchDeliveryNote,
  useDeliverDeliveryNote,
  type DeliveryNote,
} from '@/hooks/use-selling';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DeliveryStatus = DeliveryNote['status'];

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<DeliveryStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  draft: 'default',
  dispatched: 'info',
  delivered: 'success',
  returned: 'danger',
};

const statusLabelMap: Record<DeliveryStatus, string> = {
  draft: 'Draft',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  returned: 'Returned',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeliveryNoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const deliveryNoteId = params.id;

  const { data: deliveryNote, isLoading, error } = useDeliveryNote(deliveryNoteId);
  const updateMutation = useUpdateDeliveryNote();
  const dispatchMutation = useDispatchDeliveryNote();
  const deliverMutation = useDeliverDeliveryNote();

  // Local editable state
  const [localDeliveryDate, setLocalDeliveryDate] = useState<string | null>(null);
  const [localCarrier, setLocalCarrier] = useState<string | null>(null);
  const [localTrackingNumber, setLocalTrackingNumber] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  // Derived values
  const status = deliveryNote?.status ?? 'draft';
  const isDraft = status === 'draft';
  const isDispatched = status === 'dispatched';
  const isFinished = status === 'delivered' || status === 'returned';

  const currentDeliveryDate = localDeliveryDate ?? deliveryNote?.deliveryDate ?? '';
  const currentCarrier = localCarrier ?? deliveryNote?.carrier ?? '';
  const currentTrackingNumber = localTrackingNumber ?? deliveryNote?.trackingNumber ?? '';
  const currentNotes = localNotes ?? deliveryNote?.notes ?? '';
  const customerName = deliveryNote?.customer ?? deliveryNote?.customerName ?? deliveryNote?.customerId ?? '';
  const salesOrderRef = deliveryNote?.salesOrder ?? deliveryNote?.salesOrderId ?? '';

  // Handlers
  function handleSave() {
    if (!deliveryNote) return;
    updateMutation.mutate(
      {
        id: deliveryNoteId,
        data: {
          deliveryDate: currentDeliveryDate || undefined,
          carrier: currentCarrier,
          trackingNumber: currentTrackingNumber,
          notes: currentNotes,
        },
      },
      {
        onSuccess: () => toast.success('Delivery note saved'),
        onError: () => toast.error('Failed to save delivery note'),
      },
    );
  }

  function handleDispatch() {
    dispatchMutation.mutate(deliveryNoteId, {
      onSuccess: () => toast.success('Delivery note dispatched'),
      onError: () => toast.error('Failed to dispatch delivery note'),
    });
  }

  function handleCompleteDelivery() {
    deliverMutation.mutate(deliveryNoteId, {
      onSuccess: () => toast.success('Delivery completed'),
      onError: () => toast.error('Failed to complete delivery'),
    });
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

  if (error || !deliveryNote) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading delivery note' : 'Delivery note not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/selling/delivery-notes')}
          >
            Back to delivery notes
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
            { label: 'Dispatch', onClick: handleDispatch, variant: 'outline' as const, loading: dispatchMutation.isPending },
          ],
        };
      case 'dispatched':
        return {
          primaryAction: {
            label: 'Complete Delivery',
            onClick: handleCompleteDelivery,
            loading: deliverMutation.isPending,
          },
          secondaryActions: [
            { label: 'Save', onClick: handleSave, variant: 'outline' as const },
          ],
        };
      case 'delivered':
        return {
          primaryAction: {
            label: 'Create Invoice',
            onClick: () => router.push(`/finance/invoices/new?dnId=${deliveryNoteId}&customerId=${deliveryNote?.customerId || ''}`),
          },
          secondaryActions: [],
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    { label: 'Delivery #', value: <span className="font-mono text-sm">{deliveryNote.deliveryNumber}</span> },
    {
      label: 'Sales Order',
      value: deliveryNote.salesOrderId ? (
        <Link href={`/selling/sales-orders/${deliveryNote.salesOrderId}`} className="text-primary underline font-mono text-sm">
          {salesOrderRef}
        </Link>
      ) : (
        <span className="text-muted-foreground">{salesOrderRef || '—'}</span>
      ),
    },
    { label: 'Customer', value: <Link href={`/selling/customers/${deliveryNote.customerId}`} className="text-primary underline">{customerName}</Link> },
    { label: 'Created', value: formatDate(deliveryNote.createdAt) },
    { label: 'Last Updated', value: formatDate(deliveryNote.updatedAt) },
  ];

  return (
    <FormPage
      title={deliveryNote.deliveryNumber}
      breadcrumbs={[
        { label: 'Selling', href: '/selling' },
        { label: 'Delivery Notes', href: '/selling/delivery-notes' },
        { label: deliveryNote.deliveryNumber },
      ]}
      backHref="/selling/delivery-notes"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Delivery Details */}
        <FormSection title="Delivery Details" columns={2}>
          <FormField label="Delivery Note #">
            <Input value={deliveryNote.deliveryNumber} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Sales Order">
            <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
              {deliveryNote.salesOrderId ? (
                <Link href={`/selling/sales-orders/${deliveryNote.salesOrderId}`} className="text-primary underline font-mono">
                  {salesOrderRef}
                </Link>
              ) : (
                <span className="text-muted-foreground">{salesOrderRef || '—'}</span>
              )}
            </div>
          </FormField>
          <FormField label="Customer">
            <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
              <Link href={`/selling/customers/${deliveryNote.customerId}`} className="text-primary underline">
                {customerName}
              </Link>
            </div>
          </FormField>
          <FormField label="Delivery Date">
            <Input
              type="date"
              value={currentDeliveryDate}
              onChange={(e) => setLocalDeliveryDate(e.target.value)}
              disabled={isFinished}
            />
          </FormField>
        </FormSection>

        {/* Shipping & Carrier */}
        <FormSection title="Shipping Information" columns={2}>
          <FormField label="Carrier">
            <Input
              value={currentCarrier}
              onChange={(e) => setLocalCarrier(e.target.value)}
              placeholder="e.g. FedEx, UPS, DHL"
              disabled={isFinished}
            />
          </FormField>
          <FormField label="Tracking Number">
            <Input
              value={currentTrackingNumber}
              onChange={(e) => setLocalTrackingNumber(e.target.value)}
              placeholder="Tracking number"
              disabled={isFinished}
            />
          </FormField>
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Delivery notes"
              disabled={isFinished}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
