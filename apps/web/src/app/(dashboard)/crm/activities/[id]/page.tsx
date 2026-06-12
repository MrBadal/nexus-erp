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
import { Badge } from '@/components/ui/badge';
import {
  useActivity,
  useUpdateActivity,
  useCompleteActivity,
  type CrmActivity,
} from '@/hooks/use-crm';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type ActivityStatus = CrmActivity['status'];

const statusVariantMap: Record<ActivityStatus, 'success' | 'warning' | 'muted'> = {
  pending: 'warning',
  completed: 'success',
  cancelled: 'muted',
};

const statusLabelMap: Record<ActivityStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const typeOptions = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const activityId = params.id;

  const { data: activity, isLoading, error } = useActivity(activityId);
  const updateMutation = useUpdateActivity();
  const completeMutation = useCompleteActivity();

  // Editable state
  const [localType, setLocalType] = useState<string | null>(null);
  const [localSubject, setLocalSubject] = useState<string | null>(null);
  const [localDueDate, setLocalDueDate] = useState<string | null>(null);
  const [localDueTime, setLocalDueTime] = useState<string | null>(null);
  const [localPriority, setLocalPriority] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  const status: ActivityStatus = activity?.status ?? 'pending';
  const isPending = status === 'pending';
  const isReadOnly = status === 'completed' || status === 'cancelled';

  const currentType = localType ?? activity?.type ?? 'call';
  const currentSubject = localSubject ?? activity?.subject ?? '';
  const currentDueDate = localDueDate ?? activity?.dueDate ?? '';
  const currentDueTime = localDueTime ?? '';
  const currentPriority = localPriority ?? activity?.priority ?? 'medium';
  const currentNotes = localNotes ?? activity?.notes ?? '';

  function handleSave() {
    if (!activity) return;
    updateMutation.mutate(
      {
        id: activityId,
        data: {
          type: currentType,
          subject: currentSubject,
          dueDate: currentDueDate,
          priority: currentPriority,
          notes: currentNotes,
        },
      },
      {
        onSuccess: () => toast.success('Activity saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save activity')),
      },
    );
  }

  function handleComplete() {
    completeMutation.mutate(activityId, {
      onSuccess: () => toast.success('Activity marked as completed'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to complete activity')),
    });
  }

  // ---------- Loading / Error ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading activity' : 'Activity not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/crm/activities')}
          >
            Back to activities
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actions ----------

  const primaryAction = isPending
    ? { label: 'Save', onClick: handleSave, loading: updateMutation.isPending }
    : undefined;

  const secondaryActions = isPending
    ? [
        {
          label: 'Mark Complete',
          onClick: handleComplete,
          variant: 'outline' as const,
          disabled: completeMutation.isPending,
        },
      ]
    : [];

  const meta = [
    { label: 'Type', value: <Badge>{currentType}</Badge> },
    { label: 'Status', value: <Badge>{statusLabelMap[status]}</Badge> },
    { label: 'Contact', value: activity.contact || activity.contactId || 'N/A' },
    { label: 'Deal', value: activity.deal || activity.dealId || 'N/A' },
    { label: 'Created at', value: formatDate(activity.createdAt) },
  ];

  return (
    <FormPage
      title={activity.subject}
      breadcrumbs={[
        { label: 'CRM', href: '/crm' },
        { label: 'Activities', href: '/crm/activities' },
        { label: activity.subject },
      ]}
      backHref="/crm/activities"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      meta={meta}
    >
      <div className="space-y-6">
        {isReadOnly && (
          <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              This activity is <strong>{statusLabelMap[status]}</strong> and cannot be edited.
            </p>
          </div>
        )}

        <FormSection title="Activity Details" columns={2}>
          <FormField label="Status">
            <div className="flex items-center h-9">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  status === 'completed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : status === 'cancelled'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {statusLabelMap[status]}
              </span>
            </div>
          </FormField>
          <FormField label="Type">
            <Select value={currentType} onValueChange={(v) => setLocalType(v)} disabled={isReadOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Priority">
            <Select value={currentPriority} onValueChange={(v) => setLocalPriority(v)} disabled={isReadOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Subject" className="md:col-span-2">
            <Input
              value={currentSubject}
              onChange={(e) => setLocalSubject(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              placeholder="Activity subject"
            />
          </FormField>
          <FormField label="Contact">
            <Input value={activity.contact || activity.contactId || ''} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Deal">
            <Input value={activity.deal || activity.dealId || ''} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Due Date">
            <Input
              value={currentDueDate}
              onChange={(e) => setLocalDueDate(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              type="date"
            />
          </FormField>
          <FormField label="Due Time">
            <Input
              value={currentDueTime}
              onChange={(e) => setLocalDueTime(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              type="time"
            />
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              rows={4}
              placeholder="Activity notes and details"
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
