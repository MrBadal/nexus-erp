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
import { useCreateProject } from '@/hooks/use-projects';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewProjectPage() {
  const router = useRouter();
  const createMutation = useCreateProject();

  const [name, setName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [budget, setBudget] = useState('');
  const [customerId, setCustomerId] = useState('');

  function handleSubmit() {
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    createMutation.mutate(
      {
        name: name.trim(),
        projectCode: projectCode.trim() || undefined,
        description,
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0],
        budget: budget ? parseFloat(budget) : undefined,
        customerId: customerId.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success('Project created');
          const id = (data as { id?: string }).id;
          router.push(id ? `/projects/${id}` : '/projects');
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create project')),
      },
    );
  }

  return (
    <FormPage
      title="New Project"
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: 'New Project' },
      ]}
      backHref="/projects"
      primaryAction={{
        label: 'Create Project',
        onClick: handleSubmit,
        loading: createMutation.isPending,
      }}
    >
      <div className="space-y-6">
        <FormSection title="Project Details" columns={2}>
          <FormField label="Project Name" required>
            <Input
              value={name ?? undefined}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., ERP Migration 2026"
            />
          </FormField>
          <FormField label="Project Code">
            <Input
              value={projectCode ?? undefined}
              onChange={(e) => setProjectCode(e.target.value)}
              placeholder="Auto-generated if blank"
            />
          </FormField>
          <FormField label="Start Date">
            <DatePicker value={startDate ?? undefined} onChange={(d) => setStartDate(d)} />
          </FormField>
          <FormField label="End Date">
            <DatePicker value={endDate ?? undefined} onChange={(d) => setEndDate(d)} />
          </FormField>
          <FormField label="Budget">
            <Input
              type="number"
              value={budget ?? undefined}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g., 50000"
              min={0}
              step={0.01}
            />
          </FormField>
          <FormField label="Customer ID (optional)">
            <Input
              value={customerId ?? undefined}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Customer ID or name"
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={description ?? undefined}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project description and objectives"
              rows={4}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
