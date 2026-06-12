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
  useProjectTask,
  useUpdateProjectTask,
  useDeleteProjectTask,
  useCompleteTask,
} from '@/hooks/use-projects';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const taskId = params.id;

  const { data: task, isLoading, error } = useProjectTask(taskId);
  const updateMutation = useUpdateProjectTask();
  const deleteMutation = useDeleteProjectTask();
  const completeMutation = useCompleteTask();

  // Local editable state
  const [localTaskTitle, setLocalTaskTitle] = useState<string | null>(null);
  const [localAssignedTo, setLocalAssignedTo] = useState<string | null>(null);
  const [localPriority, setLocalPriority] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [localDueDate, setLocalDueDate] = useState<Date | null>(null);
  const [localEstimatedHours, setLocalEstimatedHours] = useState<string | null>(null);
  const [localActualHours, setLocalActualHours] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);

  const taskTitle = (task as { taskTitle?: string; name?: string } | undefined)?.taskTitle
    ?? (task as { name?: string } | undefined)?.name ?? taskId;
  const projectId = (task as { projectId?: string } | undefined)?.projectId ?? '';
  const projectName = (task as { projectName?: string } | undefined)?.projectName ?? projectId;

  const currentTaskTitle = localTaskTitle ?? taskTitle;
  const currentAssignedTo = localAssignedTo ?? (task as { assignedTo?: string } | undefined)?.assignedTo ?? '';
  const currentPriority = localPriority ?? (task as { priority?: string } | undefined)?.priority ?? 'medium';
  const currentStatus = localStatus ?? (task as { status?: string } | undefined)?.status ?? 'open';
  const currentDueDate = localDueDate ?? ((task as { dueDate?: string } | undefined)?.dueDate ? new Date((task as { dueDate?: string }).dueDate!) : null);
  const currentEstimatedHours = localEstimatedHours ?? String((task as { estimatedHours?: number } | undefined)?.estimatedHours ?? '');
  const currentActualHours = localActualHours ?? String((task as { actualHours?: number } | undefined)?.actualHours ?? '');
  const currentDescription = localDescription ?? (task as { description?: string } | undefined)?.description ?? '';

  const isCompleted = currentStatus === 'completed';

  function handleSave() {
    if (!task) return;
    updateMutation.mutate(
      {
        id: taskId,
        data: {
          taskTitle: currentTaskTitle,
          assignedTo: currentAssignedTo || undefined,
          priority: currentPriority,
          status: currentStatus,
          dueDate: currentDueDate?.toISOString().split('T')[0],
          estimatedHours: currentEstimatedHours ? parseFloat(currentEstimatedHours) : undefined,
          actualHours: currentActualHours ? parseFloat(currentActualHours) : undefined,
          description: currentDescription,
        },
      },
      {
        onSuccess: () => toast.success('Task saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save task')),
      },
    );
  }

  function handleComplete() {
    completeMutation.mutate(taskId, {
      onSuccess: () => toast.success('Task marked as complete'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to complete task')),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(taskId, {
      onSuccess: () => {
        toast.success('Task deleted');
        router.push('/projects/tasks');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete task')),
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

  if (error || !task) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading task' : 'Task not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/projects/tasks')}
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  const meta = [
    {
      label: 'Project',
      value: projectId ? (
        <button
          className="text-primary underline text-sm"
          onClick={() => router.push(`/projects/${projectId}`)}
        >
          {projectName}
        </button>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
    },
    { label: 'Assigned To', value: currentAssignedTo || '—' },
    { label: 'Created', value: formatDate((task as { createdAt?: string }).createdAt ?? '') },
    { label: 'Updated', value: formatDate((task as { updatedAt?: string }).updatedAt ?? '') },
  ];

  const statusVariantMap: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
    open: 'default',
    in_progress: 'info',
    completed: 'success',
    blocked: 'danger',
  };

  return (
    <FormPage
      title={currentTaskTitle}
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: 'Tasks', href: '/projects/tasks' },
        { label: currentTaskTitle },
      ]}
      backHref="/projects/tasks"
      status={{ label: statusOptions.find((o) => o.value === currentStatus)?.label ?? currentStatus, variant: statusVariantMap[currentStatus] ?? 'default' }}
      primaryAction={{
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      secondaryActions={
        !isCompleted
          ? [{ label: 'Mark Complete', onClick: handleComplete, variant: 'outline' as const }]
          : undefined
      }
      dangerAction={{ label: 'Delete', onClick: handleDelete }}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Task Details" columns={2}>
          <FormField label="Task Title" required className="col-span-2">
            <Input
              value={currentTaskTitle ?? undefined}
              onChange={(e) => setLocalTaskTitle(e.target.value)}
              placeholder="Task title"
              disabled={isCompleted}
            />
          </FormField>
          <FormField label="Assigned To">
            <Input
              value={currentAssignedTo ?? undefined}
              onChange={(e) => setLocalAssignedTo(e.target.value)}
              placeholder="Employee name or ID"
              disabled={isCompleted}
            />
          </FormField>
          <FormField label="Due Date">
            <DatePicker
              value={currentDueDate ?? undefined}
              onChange={(d) => setLocalDueDate(d)}
              disabled={isCompleted}
            />
          </FormField>
          <FormField label="Priority">
            <Select
              value={currentPriority}
              onValueChange={(v) => setLocalPriority(v)}
              disabled={isCompleted}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select
              value={currentStatus}
              onValueChange={(v) => setLocalStatus(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Estimated Hours">
            <Input
              type="number"
              value={currentEstimatedHours ?? undefined}
              onChange={(e) => setLocalEstimatedHours(e.target.value)}
              placeholder="e.g., 8"
              disabled={isCompleted}
              min={0}
              step={0.5}
            />
          </FormField>
          <FormField label="Actual Hours">
            <Input
              type="number"
              value={currentActualHours ?? undefined}
              onChange={(e) => setLocalActualHours(e.target.value)}
              placeholder="e.g., 7.5"
              min={0}
              step={0.5}
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={currentDescription ?? undefined}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Task description"
              disabled={isCompleted}
              rows={4}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
