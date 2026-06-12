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
import { useCreateDeal } from '@/hooks/use-crm';

const stages = [
  { value: 'qualification', label: 'Qualification' },
  { value: 'needs_analysis', label: 'Needs Analysis' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

export default function NewDealPage() {
  const router = useRouter();
  const createDeal = useCreateDeal();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState('qualification');
  const [probability, setProbability] = useState('50');
  const [expectedClose, setExpectedClose] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) { toast.error('Deal title is required'); return; }

    createDeal.mutate(
      {
        title,
        company: company || undefined,
        contact: contactName || undefined,
        value: value ? Number(value) : undefined,
        stage,
        probability: Number(probability) || 50,
        expectedClose: expectedClose || undefined,
        status: 'open',
        notes: notes || undefined,
      },
      {
        onSuccess: () => { toast.success('Deal created successfully'); router.push('/crm/deals'); },
        onError: (error: Error) => { toast.error(error.message || 'Failed to create deal'); },
      },
    );
  };

  return (
    <FormPage
      title="New Deal"
      subtitle="Create a new sales deal"
      backHref="/crm/deals"
      breadcrumbs={[
        { label: 'CRM', href: '/crm' },
        { label: 'Deals', href: '/crm/deals' },
        { label: 'New Deal' },
      ]}
      primaryAction={{ label: 'Create Deal', onClick: handleSubmit, loading: createDeal.isPending }}
      secondaryActions={[{ label: 'Cancel', onClick: () => router.push('/crm/deals'), variant: 'outline' }]}
    >
      <div className="space-y-6">
        <FormSection title="Deal Details" columns={2}>
          <FormField label="Deal Title" required>
            <Input placeholder="e.g. Enterprise License - Acme Corp" value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Company">
            <Input placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} />
          </FormField>
          <FormField label="Contact">
            <Input placeholder="Primary contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </FormField>
          <FormField label="Deal Value">
            <Input type="number" min="0" step="0.01" placeholder="0.00" value={value} onChange={(e) => setValue(e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Pipeline" columns={2}>
          <FormField label="Stage">
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Probability (%)">
            <Input type="number" min="0" max="100" value={probability} onChange={(e) => setProbability(e.target.value)} />
          </FormField>
          <FormField label="Expected Close Date">
            <Input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea placeholder="Deal notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
