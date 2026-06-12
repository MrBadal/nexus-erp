'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useActivateProject,
  useHoldProject,
  useCompleteProject,
  useCancelProject,
} from '@/hooks/use-projects';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<ProjectStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  planning: 'default',
  active: 'info',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

const statusLabelMap: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const { data: project, isLoading, error } = useProject(projectId);
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const activateMutation = useActivateProject();
  const holdMutation = useHoldProject();
  const completeMutation = useCompleteProject();
  const cancelMutation = useCancelProject();

  // Local editable state
  const [localName, setLocalName] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [localCustomerId, setLocalCustomerId] = useState<string | null>(null);
  const [localStartDate, setLocalStartDate] = useState<Date | null>(null);
  const [localEndDate, setLocalEndDate] = useState<Date | null>(null);
  const [localBudget, setLocalBudget] = useState<string | null>(null);

  const rawStatus = (project as { status?: string } | undefined)?.status ?? 'planning';
  const status: ProjectStatus =
    (['planning', 'active', 'on_hold', 'completed', 'cancelled'] as ProjectStatus[]).includes(rawStatus as ProjectStatus)
      ? (rawStatus as ProjectStatus)
      : 'planning';

  const isReadOnly = status === 'completed' || status === 'cancelled';

  const projectCode = (project as { projectCode?: string; projectNumber?: string } | undefined)?.projectCode
    ?? (project as { projectNumber?: string } | undefined)?.projectNumber
    ?? projectId;
  const currentName = localName ?? (project as { name?: string } | undefined)?.name ?? '';
  const currentDescription = localDescription ?? (project as { description?: string } | undefined)?.description ?? '';
  const currentCustomerId = localCustomerId ?? (project as { customerId?: string } | undefined)?.customerId ?? '';
  const currentStartDate = localStartDate ?? ((project as { startDate?: string } | undefined)?.startDate ? new Date((project as { startDate?: string }).startDate!) : null);
  const currentEndDate = localEndDate ?? ((project as { endDate?: string } | undefined)?.endDate ? new Date((project as { endDate?: string }).endDate!) : null);
  const currentBudget = localBudget ?? String((project as { budget?: number } | undefined)?.budget ?? '');
  const actualCost = (project as { actualCost?: number } | undefined)?.actualCost ?? 0;
  const taskCount = (project as { taskCount?: number } | undefined)?.taskCount ?? 0;

  function handleSave() {
    if (!project) return;
    updateMutation.mutate(
      {
        id: projectId,
        data: {
          name: currentName,
          description: currentDescription,
          customerId: currentCustomerId || undefined,
          startDate: currentStartDate?.toISOString().split('T')[0],
          endDate: currentEndDate?.toISOString().split('T')[0],
          budget: currentBudget ? parseFloat(currentBudget) : undefined,
        },
      },
      {
        onSuccess: () => toast.success('Project saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save project')),
      },
    );
  }

  function handleActivate() {
    activateMutation.mutate(projectId, {
      onSuccess: () => toast.success('Project activated'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to activate project')),
    });
  }

  function handleHold() {
    holdMutation.mutate(projectId, {
      onSuccess: () => toast.success('Project put on hold'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to hold project')),
    });
  }

  function handleComplete() {
    completeMutation.mutate(projectId, {
      onSuccess: () => toast.success('Project completed'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to complete project')),
    });
  }

  function handleCancel() {
    cancelMutation.mutate(projectId, {
      onSuccess: () => toast.success('Project cancelled'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to cancel project')),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(projectId, {
      onSuccess: () => {
        toast.success('Project deleted');
        router.push('/projects');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete project')),
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

  if (error || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading project' : 'Project not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/projects')}
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  function getActions() {
    switch (status) {
      case 'planning':
        return {
          primaryAction: {
            label: 'Activate Project',
            onClick: handleActivate,
            loading: activateMutation.isPending,
          },
          secondaryActions: [
            { label: 'Save', onClick: handleSave, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Cancel Project', onClick: handleCancel },
        };
      case 'active':
        return {
          primaryAction: {
            label: 'Save',
            onClick: handleSave,
            loading: updateMutation.isPending,
          },
          secondaryActions: [
            { label: 'Hold Project', onClick: handleHold, variant: 'outline' as const },
            { label: 'Complete Project', onClick: handleComplete, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Cancel Project', onClick: handleCancel },
        };
      case 'on_hold':
        return {
          primaryAction: {
            label: 'Resume Project',
            onClick: handleActivate,
            loading: activateMutation.isPending,
          },
          dangerAction: { label: 'Cancel Project', onClick: handleCancel },
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    { label: 'Project Code', value: <span className="font-mono text-sm">{projectCode}</span> },
    { label: 'Budget', value: <span className="font-mono">{currentBudget ? formatCurrency(parseFloat(currentBudget)) : '—'}</span> },
    { label: 'Actual Cost', value: <span className="font-mono">{formatCurrency(actualCost)}</span> },
    {
      label: 'Tasks',
      value: (
        <Link
          href={`/projects/tasks?projectId=${projectId}`}
          className="text-primary underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </Link>
      ),
    },
    { label: 'Created', value: formatDate((project as { createdAt?: string }).createdAt ?? '') },
  ];

  return (
    <FormPage
      title={currentName || projectCode}
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: currentName || projectCode },
      ]}
      backHref="/projects"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      dangerAction={actions.dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Project Details" columns={2}>
          <FormField label="Project Code">
            <Input value={projectCode} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Status">
            <Input value={statusLabelMap[status]} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Name" required>
            <Input
              value={currentName ?? undefined}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Project name"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Customer ID (optional)">
            <Input
              value={currentCustomerId ?? undefined}
              onChange={(e) => setLocalCustomerId(e.target.value)}
              placeholder="Customer ID or name"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Start Date">
            <DatePicker
              value={currentStartDate ?? undefined}
              onChange={(d) => setLocalStartDate(d)}
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="End Date">
            <DatePicker
              value={currentEndDate ?? undefined}
              onChange={(d) => setLocalEndDate(d)}
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Budget">
            <Input
              type="number"
              value={currentBudget ?? undefined}
              onChange={(e) => setLocalBudget(e.target.value)}
              placeholder="e.g., 50000"
              disabled={isReadOnly}
              min={0}
              step={0.01}
            />
          </FormField>
          <FormField label="Actual Cost (readonly)">
            <Input
              value={formatCurrency(actualCost)}
              readOnly
              className="bg-muted font-mono"
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={currentDescription ?? undefined}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Project description"
              disabled={isReadOnly}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
