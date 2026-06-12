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
import { useCreateContact } from '@/hooks/use-crm';

interface FormData {
  type: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  source: string;
  notes: string;
}

const initialFormData: FormData = {
  type: 'lead',
  salutation: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  jobTitle: '',
  source: '',
  notes: '',
};

export default function NewContactPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const createContact = useCreateContact();

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email address';
    if (!form.type) newErrors.type = 'Contact type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = {
      name: `${form.salutation ? form.salutation + ' ' : ''}${form.firstName} ${form.lastName}`.trim(),
      firstName: form.firstName,
      lastName: form.lastName,
      salutation: form.salutation || undefined,
      email: form.email,
      phone: form.phone || undefined,
      company: form.company || undefined,
      jobTitle: form.jobTitle || undefined,
      type: form.type,
      source: form.source || undefined,
      notes: form.notes || undefined,
    };

    createContact.mutate(payload, {
      onSuccess: () => {
        toast.success('Contact created successfully');
        router.push('/crm/contacts');
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to create contact');
      },
    });
  };

  return (
    <FormPage
      title="New Contact"
      subtitle="Add a new contact to your CRM"
      backHref="/crm/contacts"
      breadcrumbs={[
        { label: 'CRM', href: '/crm' },
        { label: 'Contacts', href: '/crm/contacts' },
        { label: 'New Contact' },
      ]}
      primaryAction={{
        label: 'Create Contact',
        onClick: handleSubmit,
        loading: createContact.isPending,
        disabled: createContact.isPending,
      }}
      secondaryActions={[
        {
          label: 'Cancel',
          onClick: () => router.push('/crm/contacts'),
          variant: 'outline',
        },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="Contact Type" columns={2}>
          <FormField label="Type" required error={errors.type}>
            <Select value={form.type} onValueChange={(v) => update('type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Source">
            <Select value={form.source} onValueChange={(v) => update('source', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="cold_call">Cold Call</SelectItem>
                <SelectItem value="trade_show">Trade Show</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        <FormSection title="Personal Information" columns={2}>
          <FormField label="Salutation">
            <Select value={form.salutation} onValueChange={(v) => update('salutation', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select salutation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mr.">Mr.</SelectItem>
                <SelectItem value="Mrs.">Mrs.</SelectItem>
                <SelectItem value="Ms.">Ms.</SelectItem>
                <SelectItem value="Dr.">Dr.</SelectItem>
                <SelectItem value="Prof.">Prof.</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <div /> {/* Empty cell for alignment */}
          <FormField label="First Name" required error={errors.firstName}>
            <Input
              placeholder="Enter first name"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
            />
          </FormField>
          <FormField label="Last Name" required error={errors.lastName}>
            <Input
              placeholder="Enter last name"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
            />
          </FormField>
          <FormField label="Email" required error={errors.email}>
            <Input
              type="email"
              placeholder="contact@company.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </FormField>
          <FormField label="Phone">
            <Input
              type="tel"
              placeholder="+1 555-0100"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </FormField>
        </FormSection>

        <FormSection title="Company Details" columns={2}>
          <FormField label="Company">
            <Input
              placeholder="Company name"
              value={form.company}
              onChange={(e) => update('company', e.target.value)}
            />
          </FormField>
          <FormField label="Job Title">
            <Input
              placeholder="e.g. CEO, Sales Manager"
              value={form.jobTitle}
              onChange={(e) => update('jobTitle', e.target.value)}
            />
          </FormField>
        </FormSection>

        <FormSection title="Additional Information" columns={1}>
          <FormField label="Notes">
            <Textarea
              placeholder="Any additional notes about this contact..."
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
