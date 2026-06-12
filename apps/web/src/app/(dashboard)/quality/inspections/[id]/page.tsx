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
  useQualityInspection,
  useUpdateQualityInspection,
  useDeleteQualityInspection,
  useAcceptInspection,
  useRejectInspection,
} from '@/hooks/use-quality';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InspectionStatus = 'pending' | 'draft' | 'in_progress' | 'accepted' | 'rejected' | 'on_hold' | 'cancelled';
type InspectionType = 'incoming' | 'in_process' | 'final' | 'audit' | 'outgoing';

interface InspectionResult {
  parameterName: string;
  specification: string;
  actualValue: string;
  result: 'pass' | 'fail';
}

interface InspectionData {
  id: string;
  inspectionNumber?: string;
  inspectionType?: InspectionType;
  referenceType?: string;
  referenceId?: string;
  inspectedBy?: string;
  inspectionDate?: string;
  status: InspectionStatus;
  notes?: string;
  conclusions?: string;
  results?: InspectionResult[];
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const inspectionTypes = [
  { value: 'incoming', label: 'Incoming' },
  { value: 'in_process', label: 'In Process' },
  { value: 'final', label: 'Final' },
  { value: 'audit', label: 'Audit' },
  { value: 'outgoing', label: 'Outgoing' },
];

const statusVariantMap: Record<InspectionStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  pending: 'default',
  draft: 'default',
  in_progress: 'info',
  accepted: 'success',
  rejected: 'danger',
  on_hold: 'warning',
  cancelled: 'muted',
};

const statusLabelMap: Record<InspectionStatus, string> = {
  pending: 'Pending',
  draft: 'Draft',
  in_progress: 'In Progress',
  accepted: 'Accepted',
  rejected: 'Rejected',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const inspectionId = params.id;

  const { data: inspection, isLoading, error } = useQualityInspection(inspectionId);
  const updateMutation = useUpdateQualityInspection();
  const deleteMutation = useDeleteQualityInspection();
  const acceptMutation = useAcceptInspection();
  const rejectMutation = useRejectInspection();

  const inspectionData = inspection as InspectionData | undefined;

  // Local editable state
  const [localInspectionType, setLocalInspectionType] = useState<string | null>(null);
  const [localReferenceType, setLocalReferenceType] = useState<string | null>(null);
  const [localReferenceId, setLocalReferenceId] = useState<string | null>(null);
  const [localInspectedBy, setLocalInspectedBy] = useState<string | null>(null);
  const [localInspectionDate, setLocalInspectionDate] = useState<Date | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const [localConclusions, setLocalConclusions] = useState<string | null>(null);
  const [localResults, setLocalResults] = useState<InspectionResult[] | null>(null);

  const status: InspectionStatus = (inspectionData?.status ?? 'pending') as InspectionStatus;
  const isReadOnly = status === 'accepted' || status === 'rejected' || status === 'cancelled';

  const currentInspectionType = localInspectionType ?? inspectionData?.inspectionType ?? 'incoming';
  const currentReferenceType = localReferenceType ?? inspectionData?.referenceType ?? '';
  const currentReferenceId = localReferenceId ?? inspectionData?.referenceId ?? '';
  const currentInspectedBy = localInspectedBy ?? inspectionData?.inspectedBy ?? '';
  const inspDateValue = inspectionData?.inspectionDate;
  const currentInspectionDate = localInspectionDate ?? (inspDateValue ? new Date(inspDateValue) : new Date());
  const currentNotes = localNotes ?? inspectionData?.notes ?? '';
  const currentConclusions = localConclusions ?? inspectionData?.conclusions ?? '';
  const currentResults: InspectionResult[] = localResults ?? inspectionData?.results ?? [];

  function handleSave() {
    if (!inspectionData) return;
    updateMutation.mutate(
      {
        id: inspectionId,
        data: {
          inspectionType: currentInspectionType,
          referenceType: currentReferenceType || undefined,
          referenceId: currentReferenceId || undefined,
          inspectedBy: currentInspectedBy || undefined,
          inspectionDate: currentInspectionDate.toISOString().split('T')[0],
          notes: currentNotes || undefined,
          conclusions: currentConclusions || undefined,
          results: currentResults,
        },
      },
      {
        onSuccess: () => toast.success('Inspection saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save inspection')),
      },
    );
  }

  function handleAccept() {
    acceptMutation.mutate(inspectionId, {
      onSuccess: () => toast.success('Inspection accepted'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to accept inspection')),
    });
  }

  function handleReject() {
    rejectMutation.mutate(inspectionId, {
      onSuccess: () => toast.success('Inspection rejected'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to reject inspection')),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(inspectionId, {
      onSuccess: () => {
        toast.success('Inspection deleted');
        router.push('/quality/inspections');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete inspection')),
    });
  }

  function addResultRow() {
    setLocalResults([
      ...currentResults,
      { parameterName: '', specification: '', actualValue: '', result: 'pass' },
    ]);
  }

  function removeResultRow(index: number) {
    setLocalResults(currentResults.filter((_, i) => i !== index));
  }

  function updateResultRow(index: number, field: keyof InspectionResult, value: string) {
    setLocalResults(
      currentResults.map((r, i) =>
        i === index ? { ...r, [field]: value } : r,
      ),
    );
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

  if (error || !inspectionData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading inspection' : 'Inspection not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/quality/inspections')}
          >
            Back to inspections
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actions ----------

  function getActions() {
    switch (status) {
      case 'pending':
      case 'draft':
        return {
          primaryAction: {
            label: 'Save',
            onClick: handleSave,
            loading: updateMutation.isPending,
          },
          secondaryActions: [
            { label: 'Start Inspection', onClick: handleSave, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Cancel', onClick: handleDelete },
        };
      case 'in_progress':
        return {
          primaryAction: {
            label: 'Accept Inspection',
            onClick: handleAccept,
            loading: acceptMutation.isPending,
          },
          secondaryActions: [
            { label: 'Reject Inspection', onClick: handleReject, variant: 'outline' as const },
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
      label: 'Inspection #',
      value: <span className="font-mono">{inspectionData.inspectionNumber ?? inspectionId}</span>,
    },
    { label: 'Status', value: statusLabelMap[status] },
    { label: 'Inspected By', value: inspectionData.inspectedBy && isUuid(inspectionData.inspectedBy) ? 'Inspector' : (inspectionData.inspectedBy ?? '—') },
    { label: 'Created', value: formatDate(inspectionData.createdAt ?? '') },
  ];

  return (
    <FormPage
      title={inspectionData.inspectionNumber ?? `Inspection #${inspectionId}`}
      breadcrumbs={[
        { label: 'Quality', href: '/quality' },
        { label: 'Inspections', href: '/quality/inspections' },
        { label: inspectionData.inspectionNumber ?? inspectionId },
      ]}
      backHref="/quality/inspections"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      dangerAction={actions.dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Inspection Details" columns={2}>
          <FormField label="Inspection Number">
            <Input
              value={inspectionData.inspectionNumber ?? inspectionId}
              readOnly
              className="font-mono bg-muted"
            />
          </FormField>
          <FormField label="Inspection Type">
            <Select
              value={currentInspectionType}
              onValueChange={(v) => setLocalInspectionType(v)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {inspectionTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Reference Type">
            <Input
              value={currentReferenceType}
              onChange={(e) => setLocalReferenceType(e.target.value)}
              placeholder="e.g. Purchase Receipt"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Reference ID">
            <Input
              value={currentReferenceId}
              onChange={(e) => setLocalReferenceId(e.target.value)}
              placeholder="Reference document ID"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Inspected By">
            <Input
              value={currentInspectedBy}
              onChange={(e) => setLocalInspectedBy(e.target.value)}
              placeholder="Inspector name"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Inspection Date">
            <DatePicker
              value={currentInspectionDate}
              onChange={(d) => setLocalInspectionDate(d)}
              disabled={isReadOnly}
            />
          </FormField>
        </FormSection>

        {/* Inspection Results */}
        <FormSection title="Inspection Results" columns={1} collapsible={false}>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Parameter
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Specification
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actual Value
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Result
                  </th>
                  {!isReadOnly && (
                    <th className="px-3 py-2 w-10" />
                  )}
                </tr>
              </thead>
              <tbody>
                {currentResults.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Input
                        value={row.parameterName}
                        onChange={(e) => updateResultRow(i, 'parameterName', e.target.value)}
                        placeholder="Parameter name"
                        disabled={isReadOnly}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.specification}
                        onChange={(e) => updateResultRow(i, 'specification', e.target.value)}
                        placeholder="Specification"
                        disabled={isReadOnly}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.actualValue}
                        onChange={(e) => updateResultRow(i, 'actualValue', e.target.value)}
                        placeholder="Actual value"
                        disabled={isReadOnly}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Select
                        value={row.result}
                        onValueChange={(v) => updateResultRow(i, 'result', v)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pass">Pass</SelectItem>
                          <SelectItem value="fail">Fail</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    {!isReadOnly && (
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeResultRow(i)}
                          className="text-muted-foreground hover:text-destructive transition-colors text-xs"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isReadOnly && (
            <button
              onClick={addResultRow}
              className="mt-2 text-sm text-primary hover:underline"
            >
              + Add Parameter
            </button>
          )}
        </FormSection>

        <FormSection title="Notes & Conclusions" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Inspection notes"
              disabled={isReadOnly}
              rows={3}
            />
          </FormField>
          <FormField label="Conclusions">
            <Textarea
              value={currentConclusions}
              onChange={(e) => setLocalConclusions(e.target.value)}
              placeholder="Inspection conclusions"
              disabled={isReadOnly}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
