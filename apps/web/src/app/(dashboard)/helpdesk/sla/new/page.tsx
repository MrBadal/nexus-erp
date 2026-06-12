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
import { useCreateSlaPolicy } from '@/hooks/use-helpdesk';

export default function NewSlaPage() {
  const router = useRouter();
  const createSla = useCreateSlaPolicy();

  const [name, setName] = useState('');
  const [priority, setPriority] = useState('medium');
  const [responseTimeHours, setResponseTimeHours] = useState('4');
  const [resolutionTimeHours, setResolutionTimeHours] = useState('24');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Policy name is required'); return; }

    createSla.mutate(
      {
        name,
        priority,
        responseTimeHours: Number(responseTimeHours) || 4,
        resolutionTimeHours: Number(resolutionTimeHours) || 24,
        description: description || undefined,
      },
      {
        onSuccess: () => { toast.success('SLA policy created'); router.push('/helpdesk/sla'); },
        onError: (error: Error) => { toast.error(error.message || 'Failed to create SLA policy'); },
      },
    );
  };

  return (
    <FormPage
      title="New SLA Policy"
      subtitle="Define service level agreement targets"
      backHref="/helpdesk/sla"
      breadcrumbs={[
        { label: 'Helpdesk', href: '/helpdesk' },
        { label: 'SLA Policies', href: '/helpdesk/sla' },
        { label: 'New Policy' },
      ]}
      primaryAction={{ label: 'Create Policy', onClick: handleSubmit, loading: createSla.isPending }}
      secondaryActions={[{ label: 'Cancel', onClick: () => router.push('/helpdesk/sla'), variant: 'outline' }]}
    >
      <div className="space-y-6">
        <FormSection title="Policy Details" columns={2}>
          <FormField label="Policy Name" required>
            <Input placeholder="e.g. Standard Support SLA" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Priority">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        <FormSection title="SLA Targets" columns={2}>
          <FormField label="Response Time (Hours)">
            <Input type="number" min="1" value={responseTimeHours} onChange={(e) => setResponseTimeHours(e.target.value)} />
          </FormField>
          <FormField label="Resolution Time (Hours)">
            <Input type="number" min="1" value={resolutionTimeHours} onChange={(e) => setResolutionTimeHours(e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Description" columns={1}>
          <FormField label="Description">
            <Textarea placeholder="Describe the SLA policy..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
