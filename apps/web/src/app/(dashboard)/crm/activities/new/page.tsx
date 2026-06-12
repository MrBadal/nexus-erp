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
import { useCreateActivity } from '@/hooks/use-crm';

export default function NewActivityPage() {
  const router = useRouter();
  const createActivity = useCreateActivity();

  const [type, setType] = useState<string>('call');
  const [subject, setSubject] = useState('');
  const [contactName, setContactName] = useState('');
  const [dealName, setDealName] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }

    createActivity.mutate(
      {
        type,
        subject,
        contact: contactName || undefined,
        deal: dealName || undefined,
        dueDate,
        priority,
        status: 'pending',
        notes: notes || undefined,
      },
      {
        onSuccess: () => { toast.success('Activity created'); router.push('/crm/activities'); },
        onError: (error: Error) => { toast.error(error.message || 'Failed to create activity'); },
      },
    );
  };

  return (
    <FormPage
      title="New Activity"
      subtitle="Schedule a new CRM activity"
      backHref="/crm/activities"
      breadcrumbs={[
        { label: 'CRM', href: '/crm' },
        { label: 'Activities', href: '/crm/activities' },
        { label: 'New Activity' },
      ]}
      primaryAction={{ label: 'Create Activity', onClick: handleSubmit, loading: createActivity.isPending }}
      secondaryActions={[{ label: 'Cancel', onClick: () => router.push('/crm/activities'), variant: 'outline' }]}
    >
      <div className="space-y-6">
        <FormSection title="Activity Details" columns={2}>
          <FormField label="Type" required>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Subject" required>
            <Input placeholder="Activity subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </FormField>
          <FormField label="Contact">
            <Input placeholder="Related contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </FormField>
          <FormField label="Deal">
            <Input placeholder="Related deal" value={dealName} onChange={(e) => setDealName(e.target.value)} />
          </FormField>
          <FormField label="Due Date" required>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
          <FormField label="Priority">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea placeholder="Activity notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
