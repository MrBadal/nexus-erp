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
  useTimesheet,
  useUpdateTimesheet,
  useSubmitTimesheet,
  useApproveTimesheet,
  useRejectTimesheet,
  useProjects,
  useProjectTasks,
} from '@/hooks/use-projects';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<TimesheetStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'danger',
};

const statusLabelMap: Record<TimesheetStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TimesheetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tsId = params.id;

  const { data: ts, isLoading, error } = useTimesheet(tsId);
  const updateMutation = useUpdateTimesheet();
  const submitMutation = useSubmitTimesheet();
  const approveMutation = useApproveTimesheet();
  const rejectMutation = useRejectTimesheet();

  const { data: projectsData } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { data: tasksData } = useProjectTasks(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  const projectsList = (projectsData as { id: string; name?: string; projectCode?: string }[] | undefined) ?? [];
  const tasksList = (tasksData as { id: string; taskTitle?: string; name?: string }[] | undefined) ?? [];

  // Local editable state
  const [localTimesheetDate, setLocalTimesheetDate] = useState<Date | null>(null);
  const [localEmployeeId, setLocalEmployeeId] = useState<string | null>(null);
  const [localProjectId, setLocalProjectId] = useState<string | null>(null);
  const [localTaskId, setLocalTaskId] = useState<string | null>(null);
  const [localHours, setLocalHours] = useState<string | null>(null);
  const [localBillable, setLocalBillable] = useState<boolean | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  const rawStatus = (ts as { status?: string } | undefined)?.status ?? 'draft';
  const status: TimesheetStatus =
    (['draft', 'submitted', 'approved', 'rejected'] as TimesheetStatus[]).includes(rawStatus as TimesheetStatus)
      ? (rawStatus as TimesheetStatus)
      : 'draft';

  const isDraft = status === 'draft';
  const isSubmitted = status === 'submitted';
  const isReadOnly = status === 'approved' || status === 'rejected';

  const currentTimesheetDate = localTimesheetDate ?? ((ts as { timesheetDate?: string } | undefined)?.timesheetDate ? new Date((ts as { timesheetDate?: string }).timesheetDate!) : null);
  const currentEmployeeId = localEmployeeId ?? (ts as { employeeId?: string; employeeName?: string } | undefined)?.employeeId ?? (ts as { employeeName?: string } | undefined)?.employeeName ?? '';
  const currentProjectId = localProjectId ?? (ts as { projectId?: string } | undefined)?.projectId ?? '';
  const currentTaskId = localTaskId ?? (ts as { taskId?: string } | undefined)?.taskId ?? '';
  const currentHours = localHours ?? String((ts as { hours?: number } | undefined)?.hours ?? '');
  const currentBillable = localBillable ?? ((ts as { billable?: boolean } | undefined)?.billable ?? true);
  const currentNotes = localNotes ?? (ts as { notes?: string; description?: string } | undefined)?.notes ?? (ts as { description?: string } | undefined)?.description ?? '';

  // Keep project context for task filtering
  const effectiveProjectId = localProjectId ?? currentProjectId;
  if (effectiveProjectId && selectedProjectId !== effectiveProjectId) {
    setSelectedProjectId(effectiveProjectId);
  }

  function handleProjectChange(v: string) {
    setLocalProjectId(v);
    setSelectedProjectId(v);
    setLocalTaskId('');
  }

  function handleSave() {
    if (!ts) return;
    updateMutation.mutate(
      {
        id: tsId,
        data: {
          timesheetDate: currentTimesheetDate?.toISOString().split('T')[0],
          employeeId: currentEmployeeId || undefined,
          projectId: currentProjectId || undefined,
          taskId: currentTaskId || undefined,
          hours: currentHours ? parseFloat(currentHours) : undefined,
          billable: currentBillable,
          notes: currentNotes,
        },
      },
      {
        onSuccess: () => toast.success('Timesheet saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save timesheet')),
      },
    );
  }

  function handleSubmit() {
    submitMutation.mutate(tsId, {
      onSuccess: () => toast.success('Timesheet submitted'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to submit timesheet')),
    });
  }

  function handleApprove() {
    approveMutation.mutate(tsId, {
      onSuccess: () => toast.success('Timesheet approved'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to approve timesheet')),
    });
  }

  function handleReject() {
    rejectMutation.mutate(tsId, {
      onSuccess: () => toast.success('Timesheet rejected'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to reject timesheet')),
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

  if (error || !ts) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading timesheet' : 'Timesheet not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/projects/timesheets')}
          >
            Back to Timesheets
          </button>
        </div>
      </div>
    );
  }

  function getActions() {
    if (isDraft) {
      return {
        primaryAction: {
          label: 'Save',
          onClick: handleSave,
          loading: updateMutation.isPending,
        },
        secondaryActions: [
          { label: 'Submit Timesheet', onClick: handleSubmit, variant: 'outline' as const },
        ],
      };
    }
    if (isSubmitted) {
      return {
        primaryAction: {
          label: 'Approve',
          onClick: handleApprove,
          loading: approveMutation.isPending,
        },
        secondaryActions: [
          { label: 'Reject', onClick: handleReject, variant: 'outline' as const },
        ],
      };
    }
    return {};
  }

  const actions = getActions();

  const meta = [
    { label: 'Status', value: statusLabelMap[status] },
    { label: 'Employee', value: currentEmployeeId || '—' },
    { label: 'Hours', value: <span className="font-mono">{currentHours || '—'}</span> },
    { label: 'Billable', value: currentBillable ? 'Yes' : 'No' },
    { label: 'Created', value: formatDate((ts as { createdAt?: string }).createdAt ?? '') },
  ];

  return (
    <FormPage
      title={`Timesheet — ${currentTimesheetDate?.toLocaleDateString() ?? 'No date'}`}
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: 'Timesheets', href: '/projects/timesheets' },
        { label: 'Timesheet Entry' },
      ]}
      backHref="/projects/timesheets"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Timesheet Details" columns={2}>
          <FormField label="Date">
            <DatePicker
              value={currentTimesheetDate ?? undefined}
              onChange={(d) => setLocalTimesheetDate(d)}
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Employee">
            <Input
              value={currentEmployeeId ?? undefined}
              onChange={(e) => setLocalEmployeeId(e.target.value)}
              placeholder="Employee name or ID"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Project">
            <Select
              value={currentProjectId}
              onValueChange={handleProjectChange}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {projectsList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name ?? p.projectCode ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Task">
            <Select
              value={currentTaskId}
              onValueChange={(v) => setLocalTaskId(v)}
              disabled={isReadOnly || !currentProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {tasksList.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.taskTitle ?? t.name ?? t.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Hours">
            <Input
              type="number"
              value={currentHours ?? undefined}
              onChange={(e) => setLocalHours(e.target.value)}
              placeholder="e.g., 8"
              disabled={isReadOnly}
              min={0}
              step={0.25}
            />
          </FormField>
          <FormField label="Billable">
            <Select
              value={currentBillable ? 'yes' : 'no'}
              onValueChange={(v) => setLocalBillable(v === 'yes')}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Notes" className="col-span-2">
            <Textarea
              value={currentNotes ?? undefined}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="What did you work on?"
              disabled={isReadOnly}
              rows={4}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
