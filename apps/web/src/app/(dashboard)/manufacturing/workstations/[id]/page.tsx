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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useWorkstation,
  useUpdateWorkstation,
  useDeleteWorkstation,
} from '@/hooks/use-manufacturing';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkstationType = 'machine' | 'labor' | 'equipment';
type WorkstationStatus = 'active' | 'inactive';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const workstationTypeOptions: { value: WorkstationType; label: string }[] = [
  { value: 'machine', label: 'Machine' },
  { value: 'labor', label: 'Labor' },
  { value: 'equipment', label: 'Equipment' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkstationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const wsId = params.id;

  const { data: ws, isLoading, error } = useWorkstation(wsId);
  const updateMutation = useUpdateWorkstation();
  const deleteMutation = useDeleteWorkstation();

  // Local editable state
  const [localName, setLocalName] = useState<string | null>(null);
  const [localWorkstationType, setLocalWorkstationType] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [localCapacity, setLocalCapacity] = useState<string | null>(null);
  const [localCapacityUnit, setLocalCapacityUnit] = useState<string | null>(null);
  const [localOperatingCost, setLocalOperatingCost] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  const code = (ws as { code?: string } | undefined)?.code ?? wsId;
  const currentName = localName ?? (ws as { name?: string } | undefined)?.name ?? '';
  const currentWorkstationType = localWorkstationType ?? (ws as { workstationType?: string } | undefined)?.workstationType ?? 'machine';
  const currentDescription = localDescription ?? (ws as { description?: string } | undefined)?.description ?? '';
  const currentCapacity = localCapacity ?? String((ws as { capacity?: number } | undefined)?.capacity ?? '');
  const currentCapacityUnit = localCapacityUnit ?? (ws as { capacityUnit?: string } | undefined)?.capacityUnit ?? '';
  const currentOperatingCost = localOperatingCost ?? String((ws as { operatingCost?: number } | undefined)?.operatingCost ?? '');
  const currentStatus = localStatus ?? ((ws as { isActive?: boolean } | undefined)?.isActive ? 'active' : 'inactive');

  function handleSave() {
    if (!ws) return;
    updateMutation.mutate(
      {
        id: wsId,
        data: {
          name: currentName,
          workstationType: currentWorkstationType,
          description: currentDescription,
          capacity: currentCapacity ? parseFloat(currentCapacity) : undefined,
          capacityUnit: currentCapacityUnit || undefined,
          operatingCost: currentOperatingCost ? parseFloat(currentOperatingCost) : undefined,
          isActive: currentStatus === 'active',
        },
      },
      {
        onSuccess: () => toast.success('Workstation saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save workstation')),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(wsId, {
      onSuccess: () => {
        toast.success('Workstation deleted');
        router.push('/manufacturing/workstations');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete workstation')),
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

  if (error || !ws) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading workstation' : 'Workstation not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/manufacturing/workstations')}
          >
            Back to Workstations
          </button>
        </div>
      </div>
    );
  }

  const statusVariant = currentStatus === 'active' ? 'success' as const : 'muted' as const;

  const meta = [
    { label: 'Code', value: <span className="font-mono text-sm">{code}</span> },
    { label: 'Type', value: workstationTypeOptions.find((o) => o.value === currentWorkstationType)?.label ?? currentWorkstationType },
    { label: 'Created', value: formatDate((ws as { createdAt?: string }).createdAt ?? '') },
    { label: 'Updated', value: formatDate((ws as { updatedAt?: string }).updatedAt ?? '') },
  ];

  return (
    <FormPage
      title={currentName || code}
      breadcrumbs={[
        { label: 'Manufacturing', href: '/manufacturing' },
        { label: 'Workstations', href: '/manufacturing/workstations' },
        { label: currentName || code },
      ]}
      backHref="/manufacturing/workstations"
      status={{ label: currentStatus === 'active' ? 'Active' : 'Inactive', variant: statusVariant }}
      primaryAction={{
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      dangerAction={{ label: 'Delete', onClick: handleDelete }}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Workstation Details" columns={2}>
          <FormField label="Code">
            <Input value={code} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Status">
            <Select value={currentStatus} onValueChange={(v) => setLocalStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Name">
            <Input
              value={currentName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Workstation name"
            />
          </FormField>
          <FormField label="Type">
            <Select
              value={currentWorkstationType}
              onValueChange={(v) => setLocalWorkstationType(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workstationTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Capacity">
            <Input
              type="number"
              value={currentCapacity}
              onChange={(e) => setLocalCapacity(e.target.value)}
              placeholder="e.g., 100"
              min={0}
            />
          </FormField>
          <FormField label="Capacity Unit">
            <Input
              value={currentCapacityUnit}
              onChange={(e) => setLocalCapacityUnit(e.target.value)}
              placeholder="e.g., units/hour, kg/day"
            />
          </FormField>
          <FormField label="Operating Cost (per hour)">
            <Input
              type="number"
              value={currentOperatingCost}
              onChange={(e) => setLocalOperatingCost(e.target.value)}
              placeholder="e.g., 85.00"
              min={0}
              step={0.01}
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={currentDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Workstation description"
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
