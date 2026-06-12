'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  useContact,
  useUpdateContact,
  useDeleteContact,
  useDeals,
  useActivities,
  type Contact,
} from '@/hooks/use-crm';
import { formatDate, formatCurrency, displayAssignee } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const typeOptions = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'lead', label: 'Lead' },
];

const salutationOptions = [
  { value: 'Mr.', label: 'Mr.' },
  { value: 'Ms.', label: 'Ms.' },
  { value: 'Mrs.', label: 'Mrs.' },
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Prof.', label: 'Prof.' },
];

const sourceOptions = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

const statusVariantMap: Record<Contact['status'], 'success' | 'muted'> = {
  active: 'success',
  inactive: 'muted',
};

// ---------------------------------------------------------------------------
// Tab sub-components
// ---------------------------------------------------------------------------

function DealsTab({ contactId }: { contactId: string }) {
  const router = useRouter();
  const { data } = useDeals({ contactId } as Record<string, string>);
  const deals = (data as Record<string, unknown>[] | undefined) ?? [];
  if (!deals.length) return <p className="p-4 text-sm text-muted-foreground">No deals linked to this contact.</p>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50">
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Deal</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Stage</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Probability</th>
        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Value</th>
      </tr></thead>
      <tbody>
        {deals.map((d) => (
          <tr key={d.id as string} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/crm/deals/${d.id}`)}>
            <td className="px-4 py-2 font-medium">{(d.title || '') as string}</td>
            <td className="px-4 py-2"><span className="text-xs">{(d.stage || '') as string}</span></td>
            <td className="px-4 py-2 text-muted-foreground">{(d.probability || 0) as number}%</td>
            <td className="px-4 py-2 text-right font-mono">{formatCurrency((d.value || 0) as number)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActivitiesTab({ contactId }: { contactId: string }) {
  const router = useRouter();
  const { data } = useActivities({ contactId } as Record<string, string>);
  const activities = (data as Record<string, unknown>[] | undefined) ?? [];
  if (!activities.length) return <p className="p-4 text-sm text-muted-foreground">No activities found for this contact.</p>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50">
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Subject</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Due Date</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
      </tr></thead>
      <tbody>
        {activities.map((a) => (
          <tr key={a.id as string} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/crm/activities/${a.id}`)}>
            <td className="px-4 py-2 capitalize text-xs">{(a.type || '') as string}</td>
            <td className="px-4 py-2">{(a.subject || '') as string}</td>
            <td className="px-4 py-2 text-muted-foreground">{(a.dueDate || '') as string}</td>
            <td className="px-4 py-2 capitalize text-xs">{(a.status || '') as string}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contactId = params.id;

  const { data: contact, isLoading, error } = useContact(contactId);
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();

  const [activeTab, setActiveTab] = useState('deals');

  // Editable state
  const [localType, setLocalType] = useState<string | null>(null);
  const [localSalutation, setLocalSalutation] = useState<string | null>(null);
  const [localFirstName, setLocalFirstName] = useState<string | null>(null);
  const [localLastName, setLocalLastName] = useState<string | null>(null);
  const [localCompany, setLocalCompany] = useState<string | null>(null);
  const [localJobTitle, setLocalJobTitle] = useState<string | null>(null);
  const [localEmail, setLocalEmail] = useState<string | null>(null);
  const [localPhone, setLocalPhone] = useState<string | null>(null);
  const [localWebsite, setLocalWebsite] = useState<string | null>(null);
  const [localSource, setLocalSource] = useState<string | null>(null);
  const [localAssignedTo, setLocalAssignedTo] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  const currentType = localType ?? contact?.type ?? 'customer';
  const currentSalutation = localSalutation ?? contact?.salutation ?? '';
  const currentFirstName = localFirstName ?? contact?.firstName ?? '';
  const currentLastName = localLastName ?? contact?.lastName ?? '';
  const currentCompany = localCompany ?? contact?.company ?? '';
  const currentJobTitle = localJobTitle ?? contact?.jobTitle ?? '';
  const currentEmail = localEmail ?? contact?.email ?? '';
  const currentPhone = localPhone ?? contact?.phone ?? '';
  const currentWebsite = localWebsite ?? '';
  const currentSource = localSource ?? contact?.source ?? 'other';
  const currentAssignedTo = localAssignedTo ?? displayAssignee(contact?.assignedTo, '') ?? '';
  const currentNotes = localNotes ?? contact?.notes ?? '';

  const status = contact?.status ?? 'active';

  function handleSave() {
    if (!contact) return;
    updateMutation.mutate(
      {
        id: contactId,
        data: {
          type: currentType,
          salutation: currentSalutation,
          firstName: currentFirstName,
          lastName: currentLastName,
          company: currentCompany,
          jobTitle: currentJobTitle,
          email: currentEmail,
          phone: currentPhone,
          source: currentSource,
          assignedTo: currentAssignedTo,
          notes: currentNotes,
        },
      },
      {
        onSuccess: () => toast.success('Contact saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save contact')),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(contactId, {
      onSuccess: () => {
        toast.success('Contact deleted');
        router.push('/crm/contacts');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete contact')),
    });
  }

  // ---------- Loading / Error ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading contact' : 'Contact not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/crm/contacts')}
          >
            Back to contacts
          </button>
        </div>
      </div>
    );
  }

  const displayName = contact.name || `${contact.firstName} ${contact.lastName}`.trim();

  const meta = [
    { label: 'Type', value: <Badge>{currentType}</Badge> },
    { label: 'Status', value: <Badge>{status}</Badge> },
    { label: 'Company', value: currentCompany || 'N/A' },
    { label: 'Created at', value: formatDate(contact.createdAt) },
    { label: 'Updated at', value: formatDate(contact.updatedAt) },
  ];

  return (
    <FormPage
      title={displayName}
      breadcrumbs={[
        { label: 'CRM', href: '/crm' },
        { label: 'Contacts', href: '/crm/contacts' },
        { label: displayName },
      ]}
      backHref="/crm/contacts"
      status={{ label: status === 'active' ? 'Active' : 'Inactive', variant: statusVariantMap[status] }}
      primaryAction={{ label: 'Save', onClick: handleSave, loading: updateMutation.isPending }}
      dangerAction={{ label: 'Delete', onClick: handleDelete, disabled: deleteMutation.isPending }}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <FormSection title="Basic Information" columns={2}>
          <FormField label="Type">
            <Select value={currentType} onValueChange={(v) => setLocalType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Salutation">
            <Select value={currentSalutation || 'none'} onValueChange={(v) => setLocalSalutation(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select salutation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {salutationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div /> {/* spacer */}
          <FormField label="First Name">
            <Input value={currentFirstName} onChange={(e) => setLocalFirstName(e.target.value)} placeholder="First name" />
          </FormField>
          <FormField label="Last Name">
            <Input value={currentLastName} onChange={(e) => setLocalLastName(e.target.value)} placeholder="Last name" />
          </FormField>
          <FormField label="Company">
            <Input value={currentCompany} onChange={(e) => setLocalCompany(e.target.value)} placeholder="Company name" />
          </FormField>
          <FormField label="Job Title">
            <Input value={currentJobTitle} onChange={(e) => setLocalJobTitle(e.target.value)} placeholder="Job title / position" />
          </FormField>
        </FormSection>

        {/* Contact Details */}
        <FormSection title="Contact Details" columns={2}>
          <FormField label="Email">
            <Input value={currentEmail} onChange={(e) => setLocalEmail(e.target.value)} placeholder="Email address" type="email" />
          </FormField>
          <FormField label="Phone">
            <Input value={currentPhone} onChange={(e) => setLocalPhone(e.target.value)} placeholder="Phone number" />
          </FormField>
          <FormField label="Website" className="md:col-span-2">
            <Input value={currentWebsite} onChange={(e) => setLocalWebsite(e.target.value)} placeholder="https://example.com" type="url" />
          </FormField>
        </FormSection>

        {/* Source & Assignment */}
        <FormSection title="Source & Assignment" columns={2}>
          <FormField label="Source">
            <Select value={currentSource} onValueChange={(v) => setLocalSource(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sourceOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Assigned To">
            <Input value={currentAssignedTo} onChange={(e) => setLocalAssignedTo(e.target.value)} placeholder="Assigned team member" />
          </FormField>
          <FormField label="Notes" className="md:col-span-2">
            <Textarea value={currentNotes} onChange={(e) => setLocalNotes(e.target.value)} placeholder="Internal notes about this contact" rows={4} />
          </FormField>
        </FormSection>

        {/* Related Deals & Activities */}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex border-b bg-muted/30">
            {[
              { key: 'deals', label: 'Deals' },
              { key: 'activities', label: 'Activities' },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div>
            {activeTab === 'deals' && <DealsTab contactId={contactId} />}
            {activeTab === 'activities' && <ActivitiesTab contactId={contactId} />}
          </div>
        </div>
      </div>
    </FormPage>
  );
}
