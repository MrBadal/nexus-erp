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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSlaPolicy,
  useUpdateSlaPolicy,
  useDeleteSlaPolicy,
} from '@/hooks/use-helpdesk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SlaPriority = 'low' | 'medium' | 'high' | 'urgent';

interface SlaPolicyData {
  id: string;
  name?: string;
  description?: string;
  priority?: SlaPriority;
  responseTime?: number | string;
  firstResponseHours?: number | string;
  resolutionTime?: number | string;
  resolutionHours?: number | string;
  businessHours?: boolean;
  escalationEnabled?: boolean;
  escalationTime?: number | string;
  isActive?: boolean;
  escalateTo?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SlaPolicyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const policyId = params.id;

  const { data: policy, isLoading, error } = useSlaPolicy(policyId);
  const updateMutation = useUpdateSlaPolicy();
  const deleteMutation = useDeleteSlaPolicy();

  const policyData = policy as SlaPolicyData | undefined;

  // Local editable state
  const [localName, setLocalName] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [localPriority, setLocalPriority] = useState<string | null>(null);
  const [localResponseTime, setLocalResponseTime] = useState<string | null>(null);
  const [localResolutionTime, setLocalResolutionTime] = useState<string | null>(null);
  const [localBusinessHours, setLocalBusinessHours] = useState<boolean | null>(null);
  const [localEscalationEnabled, setLocalEscalationEnabled] = useState<boolean | null>(null);
  const [localEscalationTime, setLocalEscalationTime] = useState<string | null>(null);
  const [localIsActive, setLocalIsActive] = useState<boolean | null>(null);

  const currentName = localName ?? policyData?.name ?? '';
  const currentDescription = localDescription ?? policyData?.description ?? '';
  const currentPriority = localPriority ?? policyData?.priority ?? 'medium';
  const currentResponseTime = localResponseTime ?? String(
    policyData?.responseTime ?? policyData?.firstResponseHours ?? '4',
  );
  const currentResolutionTime = localResolutionTime ?? String(
    policyData?.resolutionTime ?? policyData?.resolutionHours ?? '24',
  );
  const currentBusinessHours = localBusinessHours ?? policyData?.businessHours ?? true;
  const currentEscalationEnabled = localEscalationEnabled ?? policyData?.escalationEnabled ?? false;
  const currentEscalationTime = localEscalationTime ?? String(policyData?.escalationTime ?? '8');
  const currentIsActive = localIsActive ?? policyData?.isActive ?? true;

  function handleSave() {
    if (!policyData) return;
    updateMutation.mutate(
      {
        id: policyId,
        data: {
          name: currentName,
          description: currentDescription || undefined,
          priority: currentPriority,
          responseTime: parseInt(currentResponseTime) || 4,
          resolutionTime: parseInt(currentResolutionTime) || 24,
          businessHours: currentBusinessHours,
          escalationEnabled: currentEscalationEnabled,
          escalationTime: parseInt(currentEscalationTime) || 8,
          isActive: currentIsActive,
        },
      },
      {
        onSuccess: () => toast.success('SLA policy saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save SLA policy')),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(policyId, {
      onSuccess: () => {
        toast.success('SLA policy deleted');
        router.push('/helpdesk/sla');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete SLA policy')),
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

  if (error || !policyData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading SLA policy' : 'SLA policy not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/helpdesk/sla')}
          >
            Back to SLA policies
          </button>
        </div>
      </div>
    );
  }

  const meta = [
    { label: 'Priority', value: currentPriority },
    { label: 'Status', value: currentIsActive ? 'Active' : 'Inactive' },
    {
      label: 'First Response',
      value: `${currentResponseTime}h`,
    },
    {
      label: 'Resolution',
      value: `${currentResolutionTime}h`,
    },
  ];

  return (
    <FormPage
      title={currentName || 'SLA Policy'}
      breadcrumbs={[
        { label: 'Helpdesk', href: '/helpdesk' },
        { label: 'SLA Policies', href: '/helpdesk/sla' },
        { label: currentName || policyId },
      ]}
      backHref="/helpdesk/sla"
      status={{
        label: currentIsActive ? 'Active' : 'Inactive',
        variant: currentIsActive ? 'success' : 'muted',
      }}
      primaryAction={{
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      dangerAction={{ label: 'Delete', onClick: handleDelete }}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Policy Details" columns={2}>
          <FormField label="Name">
            <Input
              value={currentName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="SLA policy name"
            />
          </FormField>
          <FormField label="Priority">
            <Select value={currentPriority} onValueChange={(v) => setLocalPriority(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={currentDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Policy description"
              rows={3}
            />
          </FormField>
        </FormSection>

        <FormSection title="SLA Targets" columns={2}>
          <FormField label="Response Time (hours)">
            <Input
              type="number"
              value={currentResponseTime}
              onChange={(e) => setLocalResponseTime(e.target.value)}
              placeholder="4"
            />
          </FormField>
          <FormField label="Resolution Time (hours)">
            <Input
              type="number"
              value={currentResolutionTime}
              onChange={(e) => setLocalResolutionTime(e.target.value)}
              placeholder="24"
            />
          </FormField>
        </FormSection>

        <FormSection title="Settings" columns={2}>
          <FormField label="Business Hours Only">
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="businessHours"
                checked={currentBusinessHours}
                onChange={(e) => setLocalBusinessHours(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <label htmlFor="businessHours" className="text-sm text-muted-foreground">
                Apply SLA only during business hours
              </label>
            </div>
          </FormField>
          <FormField label="Active">
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={currentIsActive}
                onChange={(e) => setLocalIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <label htmlFor="isActive" className="text-sm text-muted-foreground">
                This SLA policy is active
              </label>
            </div>
          </FormField>
          <FormField label="Escalation Enabled">
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="escalationEnabled"
                checked={currentEscalationEnabled}
                onChange={(e) => setLocalEscalationEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <label htmlFor="escalationEnabled" className="text-sm text-muted-foreground">
                Enable escalation when SLA is breached
              </label>
            </div>
          </FormField>
          {currentEscalationEnabled && (
            <FormField label="Escalation Time (hours)">
              <Input
                type="number"
                value={currentEscalationTime}
                onChange={(e) => setLocalEscalationTime(e.target.value)}
                placeholder="8"
              />
            </FormField>
          )}
        </FormSection>
      </div>
    </FormPage>
  );
}
