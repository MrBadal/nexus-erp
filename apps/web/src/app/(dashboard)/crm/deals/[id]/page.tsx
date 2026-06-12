'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  useDeal,
  useUpdateDeal,
  useDeleteDeal,
  useWonDeal,
  useLostDeal,
  type Deal,
} from '@/hooks/use-crm';
import { formatCurrency, formatDate, displayAssignee } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type DealStatus = Deal['status'];

const statusVariantMap: Record<DealStatus, 'success' | 'danger' | 'default'> = {
  open: 'default',
  won: 'success',
  lost: 'danger',
};

const statusLabelMap: Record<DealStatus, string> = {
  open: 'Open',
  won: 'Won',
  lost: 'Lost',
};

const stageOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dealId = params.id;

  const { data: deal, isLoading, error } = useDeal(dealId);
  const updateMutation = useUpdateDeal();
  const deleteMutation = useDeleteDeal();
  const wonMutation = useWonDeal();
  const lostMutation = useLostDeal();

  // Editable state
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState<string | null>(null);
  const [localCurrency, setLocalCurrency] = useState<string | null>(null);
  const [localStage, setLocalStage] = useState<string | null>(null);
  const [localProbability, setLocalProbability] = useState<string | null>(null);
  const [localExpectedClose, setLocalExpectedClose] = useState<string | null>(null);
  const [localAssignedTo, setLocalAssignedTo] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  const status: DealStatus = deal?.status ?? 'open';
  const isReadOnly = status === 'won' || status === 'lost';

  const currentTitle = localTitle ?? deal?.title ?? '';
  const currentValue = localValue ?? String(deal?.value ?? 0);
  const currentCurrency = localCurrency ?? 'INR';
  const currentStage = localStage ?? deal?.stage ?? 'lead';
  const currentProbability = localProbability ?? String(deal?.probability ?? 0);
  const currentExpectedClose = localExpectedClose ?? deal?.expectedClose ?? '';
  const currentAssignedTo = localAssignedTo ?? displayAssignee(deal?.assignedTo, '') ?? '';
  const currentNotes = localNotes ?? '';

  function handleSave() {
    if (!deal) return;
    updateMutation.mutate(
      {
        id: dealId,
        data: {
          title: currentTitle,
          value: parseFloat(currentValue) || 0,
          stage: currentStage,
          probability: parseInt(currentProbability, 10) || 0,
          expectedClose: currentExpectedClose,
          assignedTo: currentAssignedTo,
        },
      },
      {
        onSuccess: () => toast.success('Deal saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save deal')),
      },
    );
  }

  function handleMarkWon() {
    wonMutation.mutate(dealId, {
      onSuccess: () => toast.success('Deal marked as won'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to update deal')),
    });
  }

  function handleMarkLost() {
    lostMutation.mutate(dealId, {
      onSuccess: () => toast.success('Deal marked as lost'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to update deal')),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(dealId, {
      onSuccess: () => {
        toast.success('Deal deleted');
        router.push('/crm/deals');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete deal')),
    });
  }

  // ---------- Loading / Error ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading deal' : 'Deal not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/crm/deals')}
          >
            Back to deals
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actions ----------

  const primaryAction = !isReadOnly
    ? { label: 'Save', onClick: handleSave, loading: updateMutation.isPending }
    : undefined;

  const secondaryActions = !isReadOnly
    ? [
        {
          label: 'Convert to Quotation',
          onClick: () => router.push(`/selling/quotations/new?dealId=${dealId}&customerName=${encodeURIComponent(deal.company || deal.contact || '')}&value=${deal.value || ''}`),
          variant: 'outline' as const,
        },
        {
          label: 'Mark as Won',
          onClick: handleMarkWon,
          variant: 'outline' as const,
          disabled: wonMutation.isPending,
        },
        {
          label: 'Mark as Lost',
          onClick: handleMarkLost,
          variant: 'outline' as const,
          disabled: lostMutation.isPending,
        },
      ]
    : [];

  const meta = [
    { label: 'Status', value: <Badge>{statusLabelMap[status]}</Badge> },
    { label: 'Value', value: <span className="font-semibold">{formatCurrency(deal.value)}</span> },
    { label: 'Contact', value: displayAssignee(deal.contact, 'N/A') },
    { label: 'Company', value: deal.company || 'N/A' },
    { label: 'Created at', value: formatDate(deal.createdAt) },
  ];

  return (
    <FormPage
      title={deal.title}
      breadcrumbs={[
        { label: 'CRM', href: '/crm' },
        { label: 'Deals', href: '/crm/deals' },
        { label: deal.title },
      ]}
      backHref="/crm/deals"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      dangerAction={
        !isReadOnly
          ? { label: 'Delete', onClick: handleDelete, disabled: deleteMutation.isPending }
          : undefined
      }
      meta={meta}
    >
      <div className="space-y-6">
        {isReadOnly && (
          <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              This deal is <strong>{statusLabelMap[status]}</strong> and cannot be edited.
            </p>
          </div>
        )}

        <FormSection title="Deal Details" columns={2}>
          <FormField label="Status">
            <div className="flex items-center h-9">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  status === 'won'
                    ? 'bg-emerald-100 text-emerald-700'
                    : status === 'lost'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {statusLabelMap[status]}
              </span>
            </div>
          </FormField>
          <FormField label="Title" className="md:col-span-2">
            <Input
              value={currentTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              placeholder="Deal title"
            />
          </FormField>
          <FormField label="Contact">
            <Input value={displayAssignee(deal.contact, '')} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Company">
            <Input value={deal.company || ''} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Value">
            <Input
              value={currentValue}
              onChange={(e) => setLocalValue(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted font-mono' : 'font-mono'}
              type="number"
              min="0"
              step="0.01"
            />
          </FormField>
          <FormField label="Currency">
            <Input
              value={currentCurrency}
              onChange={(e) => setLocalCurrency(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              placeholder="INR"
            />
          </FormField>
          <FormField label="Stage">
            <Select value={currentStage} onValueChange={(v) => setLocalStage(v)} disabled={isReadOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stageOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Probability (%)">
            <Input
              value={currentProbability}
              onChange={(e) => setLocalProbability(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              type="number"
              min="0"
              max="100"
            />
          </FormField>
          <FormField label="Expected Close Date">
            <Input
              value={currentExpectedClose}
              onChange={(e) => setLocalExpectedClose(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              type="date"
            />
          </FormField>
          <FormField label="Assigned To">
            <Input
              value={currentAssignedTo}
              onChange={(e) => setLocalAssignedTo(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              placeholder="Assigned team member"
            />
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              rows={4}
              placeholder="Deal notes and observations"
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
