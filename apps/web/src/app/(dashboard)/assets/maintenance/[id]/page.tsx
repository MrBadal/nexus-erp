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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  useAssetMaintenance,
  useUpdateAssetMaintenance,
  useDeleteAssetMaintenance,
  useCompleteMaintenance,
} from '@/hooks/use-assets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MaintenanceStatus = 'scheduled' | 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
type MaintenanceType = 'preventive' | 'corrective' | 'predictive' | 'calibration' | 'inspection';

interface MaintenanceData {
  id: string;
  maintenanceNumber?: string;
  assetId?: string;
  assetName?: string;
  assetNumber?: string;
  type?: MaintenanceType;
  maintenanceType?: MaintenanceType;
  scheduledDate?: string;
  maintenanceDate?: string;
  completedDate?: string;
  nextMaintenanceDate?: string;
  technician?: string;
  performedBy?: string;
  cost?: number | string;
  notes?: string;
  description?: string;
  status: MaintenanceStatus;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const maintenanceTypes = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'predictive', label: 'Predictive' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'inspection', label: 'Inspection' },
];

const statusVariantMap: Record<MaintenanceStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  scheduled: 'info',
  planned: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'muted',
  overdue: 'danger',
};

const statusLabelMap: Record<MaintenanceStatus, string> = {
  scheduled: 'Scheduled',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MaintenanceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const maintenanceId = params.id;

  const { data: maintenance, isLoading, error } = useAssetMaintenance(maintenanceId);
  const updateMutation = useUpdateAssetMaintenance();
  const deleteMutation = useDeleteAssetMaintenance();
  const completeMutation = useCompleteMaintenance();

  const maintenanceData = maintenance as MaintenanceData | undefined;

  // Local editable state
  const [localType, setLocalType] = useState<string | null>(null);
  const [localScheduledDate, setLocalScheduledDate] = useState<Date | null>(null);
  const [localCompletedDate, setLocalCompletedDate] = useState<Date | null>(null);
  const [localTechnician, setLocalTechnician] = useState<string | null>(null);
  const [localCost, setLocalCost] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  const status: MaintenanceStatus = (maintenanceData?.status ?? 'scheduled') as MaintenanceStatus;
  const isReadOnly = status === 'completed' || status === 'cancelled';

  const currentType = localType ?? maintenanceData?.type ?? maintenanceData?.maintenanceType ?? 'preventive';
  const scheduledDateValue = maintenanceData?.scheduledDate ?? maintenanceData?.maintenanceDate;
  const currentScheduledDate = localScheduledDate ?? (scheduledDateValue ? new Date(scheduledDateValue) : new Date());
  const completedDateValue = maintenanceData?.completedDate;
  const currentCompletedDate = localCompletedDate ?? (completedDateValue ? new Date(completedDateValue) : null);
  const currentTechnician = localTechnician ?? maintenanceData?.technician ?? maintenanceData?.performedBy ?? '';
  const currentCost = localCost ?? String(maintenanceData?.cost ?? '0');
  const currentNotes = localNotes ?? maintenanceData?.notes ?? maintenanceData?.description ?? '';

  function handleSave() {
    if (!maintenanceData) return;
    updateMutation.mutate(
      {
        id: maintenanceId,
        data: {
          type: currentType,
          scheduledDate: currentScheduledDate.toISOString().split('T')[0],
          completedDate: currentCompletedDate ? currentCompletedDate.toISOString().split('T')[0] : undefined,
          technician: currentTechnician || undefined,
          cost: parseFloat(currentCost) || 0,
          notes: currentNotes || undefined,
        },
      },
      {
        onSuccess: () => toast.success('Maintenance record saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save maintenance record')),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(maintenanceId, {
      onSuccess: () => {
        toast.success('Maintenance record deleted');
        router.push('/assets/maintenance');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete maintenance record')),
    });
  }

  function handleComplete() {
    completeMutation.mutate(maintenanceId, {
      onSuccess: () => toast.success('Maintenance completed'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to complete maintenance')),
    });
  }

  // ---------- Loading / Error states ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !maintenanceData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading maintenance record' : 'Maintenance record not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/assets/maintenance')}
          >
            Back to maintenance
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actions ----------

  function getActions() {
    switch (status) {
      case 'scheduled':
      case 'planned':
        return {
          primaryAction: {
            label: 'Save',
            onClick: handleSave,
            loading: updateMutation.isPending,
          },
          secondaryActions: [
            { label: 'Start Maintenance', onClick: handleSave, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Cancel', onClick: handleDelete },
        };
      case 'in_progress':
      case 'overdue':
        return {
          primaryAction: {
            label: 'Complete Maintenance',
            onClick: handleComplete,
            loading: completeMutation.isPending,
          },
          secondaryActions: [
            { label: 'Save', onClick: handleSave, variant: 'outline' as const },
          ],
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    {
      label: 'Maintenance #',
      value: <span className="font-mono">{maintenanceData.maintenanceNumber ?? maintenanceId}</span>,
    },
    { label: 'Asset', value: maintenanceData.assetName ?? maintenanceData.assetId ?? '—' },
    { label: 'Status', value: statusLabelMap[status] },
    { label: 'Cost', value: formatCurrency(Number(maintenanceData.cost ?? 0)) },
    { label: 'Created', value: formatDate(maintenanceData.createdAt ?? '') },
  ];

  return (
    <FormPage
      title={maintenanceData.maintenanceNumber ?? `Maintenance #${maintenanceId}`}
      breadcrumbs={[
        { label: 'Assets', href: '/assets' },
        { label: 'Maintenance', href: '/assets/maintenance' },
        { label: maintenanceData.maintenanceNumber ?? maintenanceId },
      ]}
      backHref="/assets/maintenance"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      dangerAction={actions.dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Maintenance Details" columns={2}>
          <FormField label="Maintenance Number">
            <Input
              value={maintenanceData.maintenanceNumber ?? maintenanceId}
              readOnly
              className="font-mono bg-muted"
            />
          </FormField>
          <FormField label="Asset">
            <Input
              value={maintenanceData.assetName ?? maintenanceData.assetId ?? ''}
              readOnly
              className="bg-muted"
            />
          </FormField>
          <FormField label="Type">
            <Select
              value={currentType}
              onValueChange={(v) => setLocalType(v)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {maintenanceTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Technician">
            <Input
              value={currentTechnician}
              onChange={(e) => setLocalTechnician(e.target.value)}
              placeholder="Technician or service provider"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Scheduled Date">
            <DatePicker
              value={currentScheduledDate}
              onChange={(d) => setLocalScheduledDate(d)}
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Completed Date">
            <DatePicker
              value={currentCompletedDate ?? undefined}
              onChange={(d) => setLocalCompletedDate(d)}
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Cost">
            <Input
              type="number"
              value={currentCost}
              onChange={(e) => setLocalCost(e.target.value)}
              placeholder="0.00"
              disabled={isReadOnly}
            />
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Maintenance notes"
              disabled={isReadOnly}
              rows={4}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
