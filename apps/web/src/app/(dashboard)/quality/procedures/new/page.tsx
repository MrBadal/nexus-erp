'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useCreateQualityProcedure } from '@/hooks/use-quality';

export default function NewProcedurePage() {
  const router = useRouter();
  const createProcedure = useCreateQualityProcedure();

  const [name, setName] = useState('');
  const [procedureCode, setProcedureCode] = useState('');
  const [category, setCategory] = useState('');
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Procedure name is required'); return; }

    createProcedure.mutate(
      {
        name,
        procedureCode: procedureCode || undefined,
        category: category || undefined,
        version: version || '1.0',
        description: description || undefined,
        steps: steps || undefined,
      },
      {
        onSuccess: () => { toast.success('Procedure created'); router.push('/quality/procedures'); },
        onError: (error: Error) => { toast.error(error.message || 'Failed to create procedure'); },
      },
    );
  };

  return (
    <FormPage
      title="New Quality Procedure"
      subtitle="Define a new quality procedure or SOP"
      backHref="/quality/procedures"
      breadcrumbs={[
        { label: 'Quality', href: '/quality' },
        { label: 'Procedures', href: '/quality/procedures' },
        { label: 'New Procedure' },
      ]}
      primaryAction={{ label: 'Create Procedure', onClick: handleSubmit, loading: createProcedure.isPending }}
      secondaryActions={[{ label: 'Cancel', onClick: () => router.push('/quality/procedures'), variant: 'outline' }]}
    >
      <div className="space-y-6">
        <FormSection title="Procedure Details" columns={2}>
          <FormField label="Procedure Name" required>
            <Input placeholder="e.g. Incoming Material Inspection" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Procedure Code">
            <Input placeholder="e.g. QP-001" value={procedureCode} onChange={(e) => setProcedureCode(e.target.value)} />
          </FormField>
          <FormField label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="calibration">Calibration</SelectItem>
                <SelectItem value="audit">Audit</SelectItem>
                <SelectItem value="corrective_action">Corrective Action</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Version">
            <Input placeholder="1.0" value={version} onChange={(e) => setVersion(e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Content" columns={1}>
          <FormField label="Description">
            <Textarea placeholder="Describe the purpose of this procedure..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </FormField>
          <FormField label="Steps / Instructions">
            <Textarea placeholder="Step-by-step instructions..." value={steps} onChange={(e) => setSteps(e.target.value)} rows={6} />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
