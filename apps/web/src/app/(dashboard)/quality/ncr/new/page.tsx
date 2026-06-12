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
import { useCreateNcr } from '@/hooks/use-quality';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const severityOptions = [
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'observation', label: 'Observation' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewNcrPage() {
  const router = useRouter();
  const createMutation = useCreateNcr();

  // Form state
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [source, setSource] = useState('');
  const [detectedBy, setDetectedBy] = useState('');
  const [detectedDate, setDetectedDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');

  function handleSave() {
    if (!title) {
      toast.error('Title is required');
      return;
    }
    createMutation.mutate(
      {
        title,
        severity,
        source: source || undefined,
        detectedBy: detectedBy || undefined,
        detectedDate: detectedDate.toISOString().split('T')[0],
        description: description || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success('NCR created');
          const id = (data as { id?: string })?.id;
          if (id) {
            router.push(`/quality/ncr/${id}`);
          } else {
            router.push('/quality/ncr');
          }
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create NCR')),
      },
    );
  }

  return (
    <FormPage
      title="New Non-Conformance Report"
      breadcrumbs={[
        { label: 'Quality', href: '/quality' },
        { label: 'Non-Conformance Reports', href: '/quality/ncr' },
        { label: 'New NCR' },
      ]}
      backHref="/quality/ncr"
      primaryAction={{
        label: 'Create NCR',
        onClick: handleSave,
        loading: createMutation.isPending,
      }}
      secondaryActions={[
        { label: 'Cancel', onClick: () => router.push('/quality/ncr'), variant: 'outline' },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="NCR Details" columns={2}>
          <FormField label="Title" className="col-span-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the non-conformance"
            />
          </FormField>
          <FormField label="Severity">
            <Select value={severity} onValueChange={setSeverity}>
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
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Customer complaint, internal audit"
            />
          </FormField>
          <FormField label="Detected By">
            <Input
              value={detectedBy}
              onChange={(e) => setDetectedBy(e.target.value)}
              placeholder="Person who detected the issue"
            />
          </FormField>
          <FormField label="Detected Date">
            <DatePicker value={detectedDate} onChange={setDetectedDate} />
          </FormField>
        </FormSection>

        <FormSection title="Description" columns={1}>
          <FormField label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the non-conformance in detail"
              rows={5}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
