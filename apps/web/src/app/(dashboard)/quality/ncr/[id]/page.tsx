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
import { formatDate } from '@/lib/utils';
import {
  useNcr,
  useUpdateNcr,
  useDeleteNcr,
  useCloseNcr,
} from '@/hooks/use-quality';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NcrStatus = 'open' | 'in_progress' | 'investigation' | 'corrective_action' | 'closed' | 'void';
type NcrSeverity = 'critical' | 'major' | 'minor' | 'observation';

interface NcrData {
  id: string;
  ncrNumber?: string;
  title?: string;
  severity?: NcrSeverity;
  source?: string;
  detectedBy?: string;
  detectedDate?: string;
  description?: string;
  rootCause?: string;
  correctiveAction?: string;
  dueDate?: string;
  assignedTo?: string;
  status: NcrStatus;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const severityOptions = [
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'observation', label: 'Observation' },
];

const statusVariantMap: Record<NcrStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  open: 'info',
  in_progress: 'warning',
  investigation: 'warning',
  corrective_action: 'warning',
  closed: 'success',
  void: 'muted',
};

const statusLabelMap: Record<NcrStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  investigation: 'Investigation',
  corrective_action: 'Corrective Action',
  closed: 'Closed',
  void: 'Void',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NcrDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ncrId = params.id;

  const { data: ncr, isLoading, error } = useNcr(ncrId);
  const updateMutation = useUpdateNcr();
  const deleteMutation = useDeleteNcr();
  const closeMutation = useCloseNcr();

  const ncrData = ncr as NcrData | undefined;

  // Local editable state
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [localSeverity, setLocalSeverity] = useState<string | null>(null);
  const [localSource, setLocalSource] = useState<string | null>(null);
  const [localDetectedBy, setLocalDetectedBy] = useState<string | null>(null);
  const [localDetectedDate, setLocalDetectedDate] = useState<Date | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [localRootCause, setLocalRootCause] = useState<string | null>(null);
  const [localCorrectiveAction, setLocalCorrectiveAction] = useState<string | null>(null);
  const [localDueDate, setLocalDueDate] = useState<Date | null>(null);

  const status: NcrStatus = (ncrData?.status ?? 'open') as NcrStatus;
  const isReadOnly = status === 'closed' || status === 'void';

  const currentTitle = localTitle ?? ncrData?.title ?? '';
  const currentSeverity = localSeverity ?? ncrData?.severity ?? 'minor';
  const currentSource = localSource ?? ncrData?.source ?? '';
  const currentDetectedBy = localDetectedBy ?? ncrData?.detectedBy ?? '';
  const detectedDateValue = ncrData?.detectedDate;
  const currentDetectedDate = localDetectedDate ?? (detectedDateValue ? new Date(detectedDateValue) : new Date());
  const currentDescription = localDescription ?? ncrData?.description ?? '';
  const currentRootCause = localRootCause ?? ncrData?.rootCause ?? '';
  const currentCorrectiveAction = localCorrectiveAction ?? ncrData?.correctiveAction ?? '';
  const dueDateValue = ncrData?.dueDate;
  const currentDueDate = localDueDate ?? (dueDateValue ? new Date(dueDateValue) : new Date());

  function handleSave() {
    if (!ncrData) return;
    updateMutation.mutate(
      {
        id: ncrId,
        data: {
          title: currentTitle,
          severity: currentSeverity,
          source: currentSource || undefined,
          detectedBy: currentDetectedBy || undefined,
          detectedDate: currentDetectedDate.toISOString().split('T')[0],
          description: currentDescription || undefined,
          rootCause: currentRootCause || undefined,
          correctiveAction: currentCorrectiveAction || undefined,
          dueDate: currentDueDate.toISOString().split('T')[0],
        },
      },
      {
        onSuccess: () => toast.success('NCR saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save NCR')),
      },
    );
  }

  function handleClose() {
    closeMutation.mutate(ncrId, {
      onSuccess: () => toast.success('NCR closed'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to close NCR')),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(ncrId, {
      onSuccess: () => {
        toast.success('NCR deleted');
        router.push('/quality/ncr');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete NCR')),
    });
  }

  // ---------- Loading / Error states ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !ncrData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading NCR' : 'NCR not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/quality/ncr')}
          >
            Back to NCRs
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actions ----------

  function getActions() {
    switch (status) {
      case 'open':
        return {
          primaryAction: {
            label: 'Save',
            onClick: handleSave,
            loading: updateMutation.isPending,
          },
          secondaryActions: [
            { label: 'Start Investigation', onClick: handleSave, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Delete', onClick: handleDelete },
        };
      case 'in_progress':
      case 'investigation':
      case 'corrective_action':
        return {
          primaryAction: {
            label: 'Close NCR',
            onClick: handleClose,
            loading: closeMutation.isPending,
          },
          secondaryActions: [
            { label: 'Save', onClick: handleSave, variant: 'outline' as const },
            { label: 'Escalate', onClick: handleSave, variant: 'outline' as const },
          ],
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    {
      label: 'NCR #',
      value: <span className="font-mono">{ncrData.ncrNumber ?? 'Loading...'}</span>,
    },
    { label: 'Status', value: statusLabelMap[status] },
    { label: 'Severity', value: currentSeverity },
    { label: 'Assigned To', value: ncrData.assignedTo && isUuid(ncrData.assignedTo) ? 'Assignee' : (ncrData.assignedTo ?? '—') },
    { label: 'Due Date', value: formatDate(ncrData.dueDate ?? '') },
    { label: 'Created', value: formatDate(ncrData.createdAt ?? '') },
  ];

  return (
    <FormPage
      title={ncrData.ncrNumber ?? 'NCR'}
      subtitle={currentTitle}
      breadcrumbs={[
        { label: 'Quality', href: '/quality' },
        { label: 'Non-Conformance Reports', href: '/quality/ncr' },
        { label: ncrData.ncrNumber ?? 'Loading...' },
      ]}
      backHref="/quality/ncr"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      dangerAction={actions.dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="NCR Details" columns={2}>
          <FormField label="NCR Number">
            <Input
              value={ncrData.ncrNumber ?? 'Loading...'}
              readOnly
              className="font-mono bg-muted"
            />
          </FormField>
          <FormField label="Title">
            <Input
              value={currentTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="NCR title"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Severity">
            <Select
              value={currentSeverity}
              onValueChange={(v) => setLocalSeverity(v)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Source">
            <Input
              value={currentSource}
              onChange={(e) => setLocalSource(e.target.value)}
              placeholder="Source (e.g. Customer complaint)"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Detected By">
            <Input
              value={currentDetectedBy}
              onChange={(e) => setLocalDetectedBy(e.target.value)}
              placeholder="Person who detected"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Detected Date">
            <DatePicker
              value={currentDetectedDate}
              onChange={(d) => setLocalDetectedDate(d)}
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Due Date">
            <DatePicker
              value={currentDueDate}
              onChange={(d) => setLocalDueDate(d)}
              disabled={isReadOnly}
            />
          </FormField>
        </FormSection>

        <FormSection title="Description & Analysis" columns={1}>
          <FormField label="Description">
            <Textarea
              value={currentDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Describe the non-conformance"
              disabled={isReadOnly}
              rows={4}
            />
          </FormField>
          <FormField label="Root Cause">
            <Textarea
              value={currentRootCause}
              onChange={(e) => setLocalRootCause(e.target.value)}
              placeholder="Root cause analysis"
              disabled={isReadOnly}
              rows={3}
            />
          </FormField>
          <FormField label="Corrective Action">
            <Textarea
              value={currentCorrectiveAction}
              onChange={(e) => setLocalCorrectiveAction(e.target.value)}
              placeholder="Corrective action plan"
              disabled={isReadOnly}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
