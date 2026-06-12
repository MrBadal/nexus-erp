'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useWorkOrder,
  useUpdateWorkOrder,
  useDeleteWorkOrder,
  useStartWorkOrder,
  useCompleteWorkOrder,
  useStopWorkOrder,
  useCancelWorkOrder,
  useWorkstations,
} from '@/hooks/use-manufacturing';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkOrderStatus = 'draft' | 'not_started' | 'in_progress' | 'completed' | 'stopped' | 'cancelled';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<WorkOrderStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  draft: 'default',
  not_started: 'info',
  in_progress: 'warning',
  completed: 'success',
  stopped: 'warning',
  cancelled: 'danger',
};

const statusLabelMap: Record<WorkOrderStatus, string> = {
  draft: 'Draft',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  stopped: 'Stopped',
  cancelled: 'Cancelled',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const woId = params.id;

  const { data: wo, isLoading, error } = useWorkOrder(woId);
  const updateMutation = useUpdateWorkOrder();
  const deleteMutation = useDeleteWorkOrder();
  const startMutation = useStartWorkOrder();
  const completeMutation = useCompleteWorkOrder();
  const stopMutation = useStopWorkOrder();
  const cancelMutation = useCancelWorkOrder();
  const { data: workstationsData } = useWorkstations();

  // Local state
  const [localActualQty, setLocalActualQty] = useState<string | null>(null);
  const [localPlannedStart, setLocalPlannedStart] = useState<Date | null>(null);
  const [localPlannedEnd, setLocalPlannedEnd] = useState<Date | null>(null);
  const [localWorkstationId, setLocalWorkstationId] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  const rawStatus = (wo as { status?: string } | undefined)?.status ?? 'draft';
  const status: WorkOrderStatus =
    (['draft', 'not_started', 'in_progress', 'completed', 'stopped', 'cancelled'] as WorkOrderStatus[]).includes(rawStatus as WorkOrderStatus)
      ? (rawStatus as WorkOrderStatus)
      : 'draft';

  const isCompleted = status === 'completed' || status === 'cancelled';
  const isInProgress = status === 'in_progress';

  const workOrderNumber = (wo as { workOrderNumber?: string } | undefined)?.workOrderNumber ?? woId;
  const bomName = (wo as { bomName?: string; bomId?: string } | undefined)?.bomName ?? (wo as { bomId?: string } | undefined)?.bomId ?? '';
  const bomId = (wo as { bomId?: string } | undefined)?.bomId ?? '';
  const itemName = (wo as { itemName?: string } | undefined)?.itemName ?? '';
  const plannedQty = (wo as { plannedQty?: number } | undefined)?.plannedQty ?? 0;

  const currentActualQty = localActualQty ?? String((wo as { actualQty?: number } | undefined)?.actualQty ?? '0');
  const currentPlannedStart = localPlannedStart ?? ((wo as { plannedStartDate?: string } | undefined)?.plannedStartDate ? new Date((wo as { plannedStartDate?: string }).plannedStartDate!) : null);
  const currentPlannedEnd = localPlannedEnd ?? ((wo as { plannedEndDate?: string } | undefined)?.plannedEndDate ? new Date((wo as { plannedEndDate?: string }).plannedEndDate!) : null);
  const currentWorkstationId = localWorkstationId ?? (wo as { workstationId?: string } | undefined)?.workstationId ?? '';
  const currentNotes = localNotes ?? (wo as { notes?: string } | undefined)?.notes ?? '';

  const workstationsList = (workstationsData as { id: string; name: string }[] | undefined) ?? [];

  function handleSave() {
    if (!wo) return;
    updateMutation.mutate(
      {
        id: woId,
        data: {
          actualQty: parseFloat(currentActualQty),
          plannedStartDate: currentPlannedStart?.toISOString().split('T')[0],
          plannedEndDate: currentPlannedEnd?.toISOString().split('T')[0],
          workstationId: currentWorkstationId || undefined,
          notes: currentNotes,
        },
      },
      {
        onSuccess: () => toast.success('Work order saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save work order')),
      },
    );
  }

  function handleStart() {
    startMutation.mutate(woId, {
      onSuccess: () => toast.success('Work order started'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to start work order')),
    });
  }

  function handleComplete() {
    completeMutation.mutate(woId, {
      onSuccess: () => toast.success('Work order completed'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to complete work order')),
    });
  }

  function handleStop() {
    stopMutation.mutate(woId, {
      onSuccess: () => toast.success('Work order stopped'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to stop work order')),
    });
  }

  function handleCancel() {
    cancelMutation.mutate(woId, {
      onSuccess: () => toast.success('Work order cancelled'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to cancel work order')),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(woId, {
      onSuccess: () => {
        toast.success('Work order deleted');
        router.push('/manufacturing/work-orders');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete work order')),
    });
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !wo) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading work order' : 'Work order not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/manufacturing/work-orders')}
          >
            Back to Work Orders
          </button>
        </div>
      </div>
    );
  }

  function getActions() {
    switch (status) {
      case 'draft':
      case 'not_started':
        return {
          primaryAction: {
            label: 'Start Work Order',
            onClick: handleStart,
            loading: startMutation.isPending,
          },
          secondaryActions: [
            { label: 'Save', onClick: handleSave, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Cancel', onClick: handleCancel },
        };
      case 'in_progress':
        return {
          primaryAction: {
            label: 'Complete Work Order',
            onClick: handleComplete,
            loading: completeMutation.isPending,
          },
          secondaryActions: [
            { label: 'Save', onClick: handleSave, variant: 'outline' as const },
            { label: 'Stop Work Order', onClick: handleStop, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Cancel', onClick: handleCancel },
        };
      case 'stopped':
        return {
          primaryAction: {
            label: 'Resume (Start)',
            onClick: handleStart,
            loading: startMutation.isPending,
          },
          dangerAction: { label: 'Cancel', onClick: handleCancel },
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    { label: 'Work Order #', value: <span className="font-mono text-sm">{workOrderNumber}</span> },
    {
      label: 'BOM',
      value: bomId ? (
        <button
          className="text-primary underline text-sm"
          onClick={() => router.push(`/manufacturing/bom/${bomId}`)}
        >
          {bomName || bomId}
        </button>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
    },
    { label: 'Item', value: itemName || '—' },
    { label: 'Planned Qty', value: <span className="font-mono">{plannedQty}</span> },
    { label: 'Created', value: formatDate((wo as { createdAt?: string }).createdAt ?? '') },
  ];

  return (
    <FormPage
      title={workOrderNumber}
      breadcrumbs={[
        { label: 'Manufacturing', href: '/manufacturing' },
        { label: 'Work Orders', href: '/manufacturing/work-orders' },
        { label: workOrderNumber },
      ]}
      backHref="/manufacturing/work-orders"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      dangerAction={actions.dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Work Order Details" columns={2}>
          <FormField label="Work Order #">
            <Input value={workOrderNumber} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Status">
            <Input value={statusLabelMap[status]} readOnly className="bg-muted" />
          </FormField>
          <FormField label="BOM">
            <Input value={bomName || bomId} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Item">
            <Input value={itemName} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Planned Quantity">
            <Input value={String(plannedQty)} readOnly className="bg-muted font-mono" />
          </FormField>
          <FormField label="Actual Quantity">
            <Input
              type="number"
              value={currentActualQty ?? undefined}
              onChange={(e) => setLocalActualQty(e.target.value)}
              disabled={!isInProgress}
              min={0}
            />
          </FormField>
          <FormField label="Planned Start Date">
            <DatePicker
              value={currentPlannedStart ?? undefined}
              onChange={(d) => setLocalPlannedStart(d)}
              disabled={isCompleted}
            />
          </FormField>
          <FormField label="Planned End Date">
            <DatePicker
              value={currentPlannedEnd ?? undefined}
              onChange={(d) => setLocalPlannedEnd(d)}
              disabled={isCompleted}
            />
          </FormField>
          <FormField label="Workstation">
            <Select
              value={currentWorkstationId}
              onValueChange={(v) => setLocalWorkstationId(v)}
              disabled={isCompleted}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select workstation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {workstationsList.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes ?? undefined}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Internal notes"
              disabled={isCompleted}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
