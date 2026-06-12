'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useCreateQualityInspection } from '@/hooks/use-quality';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const inspectionTypes = [
  { value: 'incoming', label: 'Incoming' },
  { value: 'in_process', label: 'In Process' },
  { value: 'final', label: 'Final' },
  { value: 'audit', label: 'Audit' },
  { value: 'outgoing', label: 'Outgoing' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewInspectionPage() {
  const router = useRouter();
  const createMutation = useCreateQualityInspection();

  // Form state
  const [inspectionType, setInspectionType] = useState('incoming');
  const [referenceType, setReferenceType] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [inspectedBy, setInspectedBy] = useState('');
  const [inspectionDate, setInspectionDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  function handleSave() {
    if (!inspectedBy) {
      toast.error('Inspector name is required');
      return;
    }
    createMutation.mutate(
      {
        inspectionType,
        referenceType: referenceType || undefined,
        referenceId: referenceId || undefined,
        inspectedBy,
        inspectionDate: inspectionDate.toISOString().split('T')[0],
        notes: notes || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success('Inspection created');
          const id = (data as { id?: string })?.id;
          if (id) {
            router.push(`/quality/inspections/${id}`);
          } else {
            router.push('/quality/inspections');
          }
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create inspection')),
      },
    );
  }

  return (
    <FormPage
      title="New Quality Inspection"
      breadcrumbs={[
        { label: 'Quality', href: '/quality' },
        { label: 'Inspections', href: '/quality/inspections' },
        { label: 'New Inspection' },
      ]}
      backHref="/quality/inspections"
      primaryAction={{
        label: 'Create Inspection',
        onClick: handleSave,
        loading: createMutation.isPending,
      }}
      secondaryActions={[
        { label: 'Cancel', onClick: () => router.push('/quality/inspections'), variant: 'outline' },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="Inspection Details" columns={2}>
          <FormField label="Inspection Type">
            <Select value={inspectionType} onValueChange={setInspectionType}>
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
          <FormField label="Inspected By">
            <Input
              value={inspectedBy}
              onChange={(e) => setInspectedBy(e.target.value)}
              placeholder="Inspector name"
            />
          </FormField>
          <FormField label="Reference Type">
            <Input
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
              placeholder="e.g. Purchase Receipt"
            />
          </FormField>
          <FormField label="Reference ID">
            <Input
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="Reference document ID"
            />
          </FormField>
          <FormField label="Inspection Date">
            <DatePicker value={inspectionDate} onChange={setInspectionDate} />
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Inspection notes"
              rows={4}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
