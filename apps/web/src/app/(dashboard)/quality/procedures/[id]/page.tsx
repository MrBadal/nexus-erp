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
import { formatDate } from '@/lib/utils';
import {
  useQualityProcedure,
  useUpdateQualityProcedure,
  useDeleteQualityProcedure,
} from '@/hooks/use-quality';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProcedureData {
  id: string;
  procedureCode?: string;
  title?: string;
  name?: string;
  category?: string;
  description?: string;
  steps?: string;
  revision?: string;
  effectiveDate?: string;
  status?: string;
  isActive?: boolean;
  processOwner?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProcedureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const procedureId = params.id;

  const { data: procedure, isLoading, error } = useQualityProcedure(procedureId);
  const updateMutation = useUpdateQualityProcedure();
  const deleteMutation = useDeleteQualityProcedure();

  const procedureData = procedure as ProcedureData | undefined;

  // Local editable state
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [localCategory, setLocalCategory] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [localSteps, setLocalSteps] = useState<string | null>(null);
  const [localRevision, setLocalRevision] = useState<string | null>(null);
  const [localEffectiveDate, setLocalEffectiveDate] = useState<Date | null>(null);
  const [localIsActive, setLocalIsActive] = useState<boolean | null>(null);

  const currentTitle = localTitle ?? procedureData?.title ?? procedureData?.name ?? '';
  const currentCategory = localCategory ?? procedureData?.category ?? '';
  const currentDescription = localDescription ?? procedureData?.description ?? '';
  const currentSteps = localSteps ?? procedureData?.steps ?? '';
  const currentRevision = localRevision ?? procedureData?.revision ?? '1.0';
  const effectiveDateValue = procedureData?.effectiveDate;
  const currentEffectiveDate = localEffectiveDate ?? (effectiveDateValue ? new Date(effectiveDateValue) : new Date());
  const currentIsActive = localIsActive ?? procedureData?.isActive ?? true;

  function handleSave() {
    if (!procedureData) return;
    updateMutation.mutate(
      {
        id: procedureId,
        data: {
          title: currentTitle,
          category: currentCategory || undefined,
          description: currentDescription || undefined,
          steps: currentSteps || undefined,
          revision: currentRevision,
          effectiveDate: currentEffectiveDate.toISOString().split('T')[0],
          isActive: currentIsActive,
        },
      },
      {
        onSuccess: () => toast.success('Procedure saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save procedure')),
      },
    );
  }

  function handleToggleActive() {
    const newActive = !currentIsActive;
    setLocalIsActive(newActive);
    updateMutation.mutate(
      {
        id: procedureId,
        data: { isActive: newActive },
      },
      {
        onSuccess: () => toast.success(newActive ? 'Procedure activated' : 'Procedure deactivated'),
        onError: (err) => {
          setLocalIsActive(!newActive);
          toast.error(apiErrorMessage(err, 'Failed to update procedure status'));
        },
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(procedureId, {
      onSuccess: () => {
        toast.success('Procedure deleted');
        router.push('/quality/procedures');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete procedure')),
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

  if (error || !procedureData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading procedure' : 'Procedure not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/quality/procedures')}
          >
            Back to procedures
          </button>
        </div>
      </div>
    );
  }

  const meta = [
    {
      label: 'Procedure Code',
      value: <span className="font-mono">{procedureData.procedureCode ?? 'Loading...'}</span>,
    },
    { label: 'Status', value: currentIsActive ? 'Active' : 'Inactive' },
    { label: 'Revision', value: currentRevision },
    { label: 'Last Updated', value: formatDate(procedureData.updatedAt ?? '') },
  ];

  return (
    <FormPage
      title={currentTitle || 'Quality Procedure'}
      breadcrumbs={[
        { label: 'Quality', href: '/quality' },
        { label: 'Procedures', href: '/quality/procedures' },
        { label: currentTitle || 'Procedure' },
      ]}
      backHref="/quality/procedures"
      status={{
        label: currentIsActive ? 'Active' : 'Inactive',
        variant: currentIsActive ? 'success' : 'muted',
      }}
      primaryAction={{
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      secondaryActions={[
        {
          label: currentIsActive ? 'Deactivate' : 'Activate',
          onClick: handleToggleActive,
          variant: 'outline',
        },
      ]}
      dangerAction={{ label: 'Delete', onClick: handleDelete }}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Procedure Details" columns={2}>
          <FormField label="Procedure Code">
            <Input
              value={procedureData.procedureCode ?? 'Loading...'}
              readOnly
              className="font-mono bg-muted"
            />
          </FormField>
          <FormField label="Title">
            <Input
              value={currentTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="Procedure title"
            />
          </FormField>
          <FormField label="Category">
            <Input
              value={currentCategory}
              onChange={(e) => setLocalCategory(e.target.value)}
              placeholder="e.g. Incoming Inspection"
            />
          </FormField>
          <FormField label="Revision">
            <Input
              value={currentRevision}
              onChange={(e) => setLocalRevision(e.target.value)}
              placeholder="1.0"
            />
          </FormField>
          <FormField label="Effective Date">
            <DatePicker
              value={currentEffectiveDate}
              onChange={(d) => setLocalEffectiveDate(d)}
            />
          </FormField>
        </FormSection>

        <FormSection title="Content" columns={1}>
          <FormField label="Description">
            <Textarea
              value={currentDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Brief description of this procedure"
              rows={3}
            />
          </FormField>
          <FormField label="Steps">
            <Textarea
              value={currentSteps}
              onChange={(e) => setLocalSteps(e.target.value)}
              placeholder="1. First step&#10;2. Second step&#10;3. Third step"
              rows={10}
              className="font-mono text-sm"
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
