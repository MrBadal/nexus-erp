'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, Target, Phone, Mail, Building2, Briefcase, MapPin } from 'lucide-react';
import { useLead, useUpdateLead, useConvertLead, useDeleteLead, type Lead } from '@/hooks/use-crm';
import { formatDate } from '@/lib/utils';

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-green-100 text-green-800',
  unqualified: 'bg-red-100 text-red-800',
  converted: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-gray-100 text-gray-800',
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useLead(id);
  const lead = data as Lead | undefined;
  const updateLead = useUpdateLead();
  const convertLead = useConvertLead();
  const deleteLead = useDeleteLead();

  const [showConvert, setShowConvert] = useState(false);
  const [convertForm, setConvertForm] = useState({
    createDeal: true,
    dealTitle: '',
    dealValue: '',
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Lead not found.</p>
        <Link href="/crm/leads"><Button variant="outline" className="mt-4">Back to Leads</Button></Link>
      </div>
    );
  }

  const handleStatusChange = async (status: string) => {
    await updateLead.mutateAsync({ id, data: { status } });
  };

  const handleConvert = async () => {
    await convertLead.mutateAsync({
      id,
      createDeal: convertForm.createDeal,
      dealTitle: convertForm.dealTitle || `${lead.name} - Deal`,
      dealValue: convertForm.dealValue || lead.estimatedValue || '0',
    });
    router.push('/crm/leads');
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this lead?')) {
      await deleteLead.mutateAsync(id);
      router.push('/crm/leads');
    }
  };

  const isConverted = lead.status === 'converted';

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/crm/leads">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{lead.name}</h1>
            <p className="text-sm text-muted-foreground">
              {lead.company && `${lead.company} · `}Score: {lead.score ?? 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
            {lead.status}
          </span>
        </div>
      </div>

      {/* Actions */}
      {!isConverted && (
        <div className="flex flex-wrap gap-2">
          {lead.status === 'new' && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('contacted')}>
              Mark as Contacted
            </Button>
          )}
          {(lead.status === 'new' || lead.status === 'contacted') && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('qualified')}>
              <Target className="mr-1 h-3.5 w-3.5" /> Qualify
            </Button>
          )}
          {lead.status !== 'lost' && lead.status !== 'converted' && (
            <Button size="sm" onClick={() => setShowConvert(true)}>
              <UserPlus className="mr-1 h-3.5 w-3.5" /> Convert to Contact
            </Button>
          )}
          {lead.status !== 'lost' && lead.status !== 'converted' && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleStatusChange('lost')}>
              Mark as Lost
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      )}

      {/* Convert Dialog */}
      {showConvert && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Convert Lead to Contact</h2>
          <p className="text-sm text-muted-foreground">
            This will create a CRM contact from this lead and optionally a deal.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={convertForm.createDeal}
                onChange={(e) => setConvertForm({ ...convertForm, createDeal: e.target.checked })}
              />
              Also create a deal
            </label>
            {convertForm.createDeal && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Deal Title</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={convertForm.dealTitle}
                    onChange={(e) => setConvertForm({ ...convertForm, dealTitle: e.target.value })}
                    placeholder={`${lead.name} - Deal`}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Deal Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={convertForm.dealValue}
                    onChange={(e) => setConvertForm({ ...convertForm, dealValue: e.target.value })}
                    placeholder={lead.estimatedValue || '0'}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleConvert} disabled={convertLead.isPending}>
                {convertLead.isPending ? 'Converting...' : 'Convert'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowConvert(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Converted info */}
      {isConverted && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">
            This lead was converted on {formatDate(lead.convertedAt)}.
            {lead.convertedContactId && (
              <> <Link href={`/crm/contacts`} className="underline">View Contact</Link></>
            )}
            {lead.convertedDealId && (
              <> · <Link href={`/crm/deals`} className="underline">View Deal</Link></>
            )}
          </p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Contact Details</h2>
          <div className="space-y-3">
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{lead.company}</span>
              </div>
            )}
            {lead.jobTitle && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{lead.jobTitle}</span>
              </div>
            )}
            {(lead.city || lead.state || lead.country) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{[lead.city, lead.state, lead.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Lead Info</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Source</dt>
              <dd className="capitalize">{(lead.source || '').replace(/_/g, ' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Score</dt>
              <dd className="font-medium">{lead.score ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Estimated Value</dt>
              <dd>
                {lead.estimatedValue
                  ? `₹${parseFloat(lead.estimatedValue).toLocaleString('en-IN')}`
                  : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(lead.createdAt)}</dd>
            </div>
            {lead.lastContactedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last Contacted</dt>
                <dd>{formatDate(lead.lastContactedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Notes */}
      {lead.notes && (
        <div className="rounded-lg border bg-card p-6 space-y-2">
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
        </div>
      )}
    </div>
  );
}
