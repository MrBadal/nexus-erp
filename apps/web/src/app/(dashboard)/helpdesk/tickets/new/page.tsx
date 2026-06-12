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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTicket } from '@/hooks/use-helpdesk';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const typeOptions = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'question', label: 'Question' },
  { value: 'complaint', label: 'Complaint' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewTicketPage() {
  const router = useRouter();
  const createMutation = useCreateTicket();

  // Form state
  const [subject, setSubject] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [type, setType] = useState('question');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  function handleSave() {
    if (!subject) {
      toast.error('Subject is required');
      return;
    }
    createMutation.mutate(
      {
        subject,
        customerId: customerId || undefined,
        priority,
        type,
        description: description || undefined,
        assignedTo: assignedTo || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success('Ticket created');
          const id = (data as { id?: string })?.id;
          if (id) {
            router.push(`/helpdesk/tickets/${id}`);
          } else {
            router.push('/helpdesk/tickets');
          }
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create ticket')),
      },
    );
  }

  return (
    <FormPage
      title="New Support Ticket"
      breadcrumbs={[
        { label: 'Helpdesk', href: '/helpdesk' },
        { label: 'Tickets', href: '/helpdesk/tickets' },
        { label: 'New Ticket' },
      ]}
      backHref="/helpdesk/tickets"
      primaryAction={{
        label: 'Create Ticket',
        onClick: handleSave,
        loading: createMutation.isPending,
      }}
      secondaryActions={[
        { label: 'Cancel', onClick: () => router.push('/helpdesk/tickets'), variant: 'outline' },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="Ticket Details" columns={2}>
          <FormField label="Subject" className="col-span-2">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
            />
          </FormField>
          <FormField label="Customer ID">
            <Input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Customer ID or name"
            />
          </FormField>
          <FormField label="Assigned To">
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Assignee"
            />
          </FormField>
          <FormField label="Priority">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        <FormSection title="Description" columns={1}>
          <FormField label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail"
              rows={6}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
