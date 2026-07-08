'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  UserPlus,
  Target,
  Phone,
  Mail,
  Building2,
  Briefcase,
  MapPin,
  PhoneCall,
  Clock,
} from 'lucide-react';
import {
  useLead,
  useUpdateLead,
  useConvertLead,
  useDeleteLead,
  useLogCall,
  useAssignLeadToMe,
  useLeadActivities,
  type Lead,
  type Disposition,
} from '@/hooks/use-crm';
import { apiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-green-100 text-green-800',
  unqualified: 'bg-red-100 text-red-800',
  converted: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
};

const dispositionLabels: Record<Disposition, string> = {
  connected: 'Connected',
  no_answer: 'No answer',
  busy: 'Busy',
  switched_off: 'Switched off',
  wrong_number: 'Wrong number',
  callback: 'Callback scheduled',
  interested: 'Interested',
  not_interested: 'Not interested',
  do_not_call: 'Do not call',
  converted: 'Converted',
};

const dispositionColors: Record<Disposition, string> = {
  connected: 'bg-blue-100 text-blue-800',
  interested: 'bg-green-100 text-green-800',
  callback: 'bg-amber-100 text-amber-800',
  converted: 'bg-emerald-100 text-emerald-800',
  not_interested: 'bg-orange-100 text-orange-800',
  do_not_call: 'bg-red-100 text-red-800',
  no_answer: 'bg-gray-100 text-gray-700',
  busy: 'bg-gray-100 text-gray-700',
  switched_off: 'bg-gray-100 text-gray-700',
  wrong_number: 'bg-gray-100 text-gray-700',
};

const DISPOSITION_ORDER: Disposition[] = [
  'connected',
  'no_answer',
  'busy',
  'switched_off',
  'wrong_number',
  'callback',
  'interested',
  'not_interested',
  'do_not_call',
  'converted',
];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useLead(id);
  const lead = data as Lead | undefined;
  const updateLead = useUpdateLead();
  const convertLead = useConvertLead();
  const deleteLead = useDeleteLead();
  const logCall = useLogCall();
  const assignToMe = useAssignLeadToMe();
  const { data: activities, isLoading: activitiesLoading } = useLeadActivities(id);

  const [showConvert, setShowConvert] = useState(false);
  const [convertForm, setConvertForm] = useState({
    createDeal: true,
    dealTitle: '',
    dealValue: '',
  });

  // Log Call form state
  const [disposition, setDisposition] = useState<Disposition | ''>('');
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound');
  const [duration, setDuration] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');

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

  const handleAssignToMe = async () => {
    try {
      await assignToMe.mutateAsync(id);
      toast.success('Lead assigned to you');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to assign lead'));
    }
  };

  const requiresFollowUp = disposition === 'callback';
  const requiresNotes = disposition === 'not_interested' || disposition === 'do_not_call';

  const handleLogCall = async () => {
    if (!lead.phone) {
      toast.error('Add a phone number first');
      return;
    }
    if (!disposition) {
      toast.error('Select a disposition');
      return;
    }
    if (requiresFollowUp) {
      if (!nextFollowUpAt) {
        toast.error('A follow-up date/time is required for a callback');
        return;
      }
      if (new Date(nextFollowUpAt).getTime() <= Date.now()) {
        toast.error('The follow-up must be in the future');
        return;
      }
    }
    if (requiresNotes && !callNotes.trim()) {
      toast.error('Notes are required for this disposition');
      return;
    }

    try {
      const updated = await logCall.mutateAsync({
        id,
        disposition,
        notes: callNotes.trim() || undefined,
        durationMinutes: duration ? Number(duration) : undefined,
        direction,
        nextFollowUpAt: nextFollowUpAt
          ? new Date(nextFollowUpAt).toISOString()
          : undefined,
      });
      toast.success(`Call logged — lead moved to ${updated?.status ?? 'updated'}`);
      setDisposition('');
      setDirection('outbound');
      setDuration('');
      setCallNotes('');
      setNextFollowUpAt('');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to log call'));
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

      {/* Header meta */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 sm:grid-cols-5">
        <div>
          <p className="text-xs text-muted-foreground">Owner</p>
          <p className="mt-1 text-sm font-medium">{lead.ownerName || 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Priority</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityColors[lead.priority] || priorityColors.low}`}>
            {lead.priority}
          </span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Next follow-up</p>
          <p className="mt-1 text-sm font-medium">
            {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Call attempts</p>
          <p className="mt-1 text-sm font-medium">{lead.callAttempts ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Last disposition</p>
          <p className="mt-1 text-sm font-medium">
            {lead.lastDisposition ? dispositionLabels[lead.lastDisposition] : '—'}
          </p>
        </div>
      </div>

      {/* Actions */}
      {!isConverted && (
        <div className="flex flex-wrap gap-2">
          {lead.assignedTo === null && (
            <Button size="sm" variant="outline" onClick={handleAssignToMe} disabled={assignToMe.isPending}>
              <UserPlus className="mr-1 h-3.5 w-3.5" /> Assign to me
            </Button>
          )}
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

      {/* Log Call — primary telecaller action */}
      {!isConverted && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Log Call</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Logging a call auto-updates the lead status: interested → qualified,
            not interested / do-not-call → lost, and a first call → contacted.
          </p>

          {!lead.phone ? (
            <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
              Add a phone number first before logging a call.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Disposition</Label>
                  <Select
                    value={disposition || undefined}
                    onValueChange={(v) => setDisposition(v as Disposition)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                    <SelectContent>
                      {DISPOSITION_ORDER.map((d) => (
                        <SelectItem key={d} value={d}>{dispositionLabels[d]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Direction</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as 'outbound' | 'inbound')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Next follow-up
                  {requiresFollowUp && <span className="ml-1 text-destructive">*required</span>}
                </Label>
                <Input
                  type="datetime-local"
                  value={nextFollowUpAt}
                  onChange={(e) => setNextFollowUpAt(e.target.value)}
                  className={requiresFollowUp ? 'border-destructive ring-1 ring-destructive' : ''}
                />
                {requiresFollowUp && (
                  <p className="text-xs text-destructive">Schedule the callback in the future.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>
                  Notes
                  {requiresNotes && <span className="ml-1 text-destructive">*required</span>}
                </Label>
                <Textarea
                  placeholder="Call notes..."
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                />
              </div>

              <Button onClick={handleLogCall} disabled={logCall.isPending}>
                <PhoneCall className="mr-1 h-4 w-4" />
                {logCall.isPending ? 'Logging...' : 'Log Call'}
              </Button>
            </>
          )}
        </Card>
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

      {/* Call history */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Call history</h2>
        </div>

        {activitiesLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !activities || activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No calls logged yet.</p>
        ) : (
          <ol className="space-y-4">
            {activities.map((a) => (
              <li key={a.id} className="flex gap-3 border-b pb-4 last:border-0 last:pb-0">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <PhoneCall className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.disposition && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dispositionColors[a.disposition]}`}>
                        {dispositionLabels[a.disposition]}
                      </span>
                    )}
                    {a.direction && (
                      <span className="text-xs capitalize text-muted-foreground">{a.direction}</span>
                    )}
                    {typeof a.durationMinutes === 'number' && (
                      <span className="text-xs text-muted-foreground">{a.durationMinutes}m</span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {a.byName || 'System'} · {formatDate(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
