'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { InlineGrid, type InlineGridColumn, type InlineGridFooterItem } from '@/components/ui/inline-grid';
import { Timeline, type TimelineEvent } from '@/components/layout/timeline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  useJournalEntry,
  useUpdateJournalEntry,
  usePostJournalEntry,
  useReverseJournalEntry,
  useDeleteJournalEntry,
  type JournalLine,
} from '@/hooks/use-journal-entries';
import { useAccounts } from '@/hooks/use-accounts';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types for inline grid rows
// ---------------------------------------------------------------------------

interface LineRow {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

// ---------------------------------------------------------------------------
// Status variant map
// ---------------------------------------------------------------------------

const statusVariantMap: Record<string, 'warning' | 'success' | 'muted'> = {
  draft: 'warning',
  posted: 'success',
  reversed: 'muted',
};

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  posted: 'Posted',
  reversed: 'Reversed',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function journalLinesToRows(lines: JournalLine[]): LineRow[] {
  return lines.map((l) => ({
    accountId: l.accountId,
    description: l.description ?? '',
    debit: parseFloat(l.debitAmount) || 0,
    credit: parseFloat(l.creditAmount) || 0,
  }));
}

function formatDateTime(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function JournalEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: entry, isLoading, error } = useJournalEntry(id);
  const { data: accounts } = useAccounts();
  const updateMutation = useUpdateJournalEntry();
  const postMutation = usePostJournalEntry();
  const reverseMutation = useReverseJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Editable local state (only used for draft entries)
  const [localDate, setLocalDate] = useState<Date | undefined>(undefined);
  const [localReference, setLocalReference] = useState<string | undefined>(undefined);
  const [localDescription, setLocalDescription] = useState<string | undefined>(undefined);
  const [localLines, setLocalLines] = useState<LineRow[] | undefined>(undefined);

  // Derive effective values: local edits or server data
  const effectiveDate = localDate ?? (entry ? new Date(entry.date) : undefined);
  const effectiveReference = localReference ?? entry?.reference ?? '';
  const effectiveDescription = localDescription ?? entry?.description ?? '';
  const effectiveLines =
    localLines ?? (entry?.lines ? journalLinesToRows(entry.lines) : []);

  const isDraft = entry?.status === 'draft';
  const isPosted = entry?.status === 'posted';
  const isReversed = entry?.status === 'reversed';

  // Account options for select
  const accountOptions = useMemo(
    () =>
      (accounts ?? [])
        .filter((a) => a.isActive && !a.isHeader)
        .map((a) => ({
          label: `${a.code} - ${a.name}`,
          value: a.id,
        })),
    [accounts],
  );

  // Grid columns
  const gridColumns: InlineGridColumn<LineRow>[] = useMemo(
    () => [
      {
        key: 'accountId',
        header: 'Account',
        type: isDraft ? 'select' : 'readonly',
        options: accountOptions,
        required: true,
        width: '2fr',
        placeholder: 'Select account',
      },
      {
        key: 'description',
        header: 'Description',
        type: isDraft ? 'text' : 'readonly',
        width: '2fr',
        placeholder: 'Line description',
      },
      {
        key: 'debit',
        header: 'Debit',
        type: isDraft ? 'currency' : 'readonly',
        width: '1fr',
        align: 'right',
      },
      {
        key: 'credit',
        header: 'Credit',
        type: isDraft ? 'currency' : 'readonly',
        width: '1fr',
        align: 'right',
      },
    ],
    [isDraft, accountOptions],
  );

  // Totals
  const totalDebit = effectiveLines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = effectiveLines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);

  const footerItems: InlineGridFooterItem[] = [
    { label: 'Total Debit', value: totalDebit },
    { label: 'Total Credit', value: totalCredit },
    {
      label: 'Difference',
      value: difference,
      variant: difference !== 0 ? 'danger' : 'success',
    },
  ];

  // Timeline events
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!entry) return [];
    const events: TimelineEvent[] = [
      {
        id: 'created',
        type: 'created',
        description: 'Journal entry created',
        user: entry.createdBy,
        date: entry.createdAt,
      },
    ];
    if (entry.postedDate) {
      events.push({
        id: 'posted',
        type: 'posted',
        description: 'Journal entry posted',
        date: entry.postedDate,
      });
    }
    if (entry.status === 'reversed') {
      events.push({
        id: 'reversed',
        type: 'reversed',
        description: 'Journal entry reversed',
        date: entry.updatedAt,
      });
    }
    return events;
  }, [entry]);

  // Handlers
  const handleAddLine = useCallback(() => {
    const current = localLines ?? (entry?.lines ? journalLinesToRows(entry.lines) : []);
    setLocalLines([...current, { accountId: '', description: '', debit: 0, credit: 0 }]);
  }, [localLines, entry]);

  const handleRemoveLine = useCallback(
    (index: number) => {
      const current = localLines ?? (entry?.lines ? journalLinesToRows(entry.lines) : []);
      setLocalLines(current.filter((_, i) => i !== index));
    },
    [localLines, entry],
  );

  const handleSave = useCallback(async () => {
    if (!entry) return;
    try {
      await updateMutation.mutateAsync({
        id: entry.id,
        data: {
          date: effectiveDate?.toISOString().split('T')[0],
          reference: effectiveReference || null,
          description: effectiveDescription || null,
        },
      });
      toast.success('Journal entry saved');
    } catch {
      toast.error('Failed to save journal entry');
    }
  }, [entry, effectiveDate, effectiveReference, effectiveDescription, updateMutation]);

  const handlePost = useCallback(async () => {
    if (!entry) return;
    if (difference !== 0) {
      toast.error('Total debits must equal total credits before posting');
      return;
    }
    try {
      await postMutation.mutateAsync(entry.id);
      toast.success('Journal entry posted successfully');
    } catch {
      toast.error('Failed to post journal entry');
    }
  }, [entry, difference, postMutation]);

  const handleReverse = useCallback(async () => {
    if (!entry) return;
    try {
      const result = await reverseMutation.mutateAsync(entry.id);
      toast.success('Journal entry reversed');
      if (result?.id) {
        router.push(`/finance/journal-entries/${result.id}`);
      }
    } catch {
      toast.error('Failed to reverse journal entry');
    }
  }, [entry, reverseMutation, router]);

  const handleDelete = useCallback(async () => {
    if (!entry) return;
    try {
      await deleteMutation.mutateAsync(entry.id);
      toast.success('Journal entry deleted');
      router.push('/finance/journal-entries');
    } catch {
      toast.error('Failed to delete journal entry');
    }
  }, [entry, deleteMutation, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Journal entry not found</p>
          <Button variant="outline" onClick={() => router.push('/finance/journal-entries')}>
            Back to Journal Entries
          </Button>
        </div>
      </div>
    );
  }

  // Build meta sidebar items
  const metaItems = [
    { label: 'Entry Number', value: <span className="font-mono">{entry.entryNumber}</span> },
    { label: 'Created By', value: entry.createdBy },
    { label: 'Created At', value: formatDateTime(entry.createdAt) },
    ...(entry.postedDate
      ? [{ label: 'Posted At', value: formatDateTime(entry.postedDate) }]
      : []),
  ];

  // Build actions based on status
  const primaryAction = isDraft
    ? {
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }
    : undefined;

  const secondaryActions = [];
  if (isDraft) {
    secondaryActions.push({
      label: 'Post',
      onClick: handlePost,
      variant: 'outline' as const,
      disabled: postMutation.isPending,
    });
  }
  if (isPosted) {
    secondaryActions.push({
      label: 'Reverse',
      onClick: handleReverse,
      variant: 'outline' as const,
      disabled: reverseMutation.isPending,
    });
  }

  const dangerAction = isDraft
    ? {
        label: 'Delete',
        onClick: () => setDeleteDialogOpen(true),
      }
    : undefined;

  return (
    <>
      <FormPage
        title={entry.entryNumber}
        subtitle={entry.description ?? undefined}
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Journal Entries', href: '/finance/journal-entries' },
          { label: entry.entryNumber },
        ]}
        backHref="/finance/journal-entries"
        status={{
          label: statusLabelMap[entry.status] ?? entry.status,
          variant: statusVariantMap[entry.status] ?? 'default',
        }}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions.length > 0 ? secondaryActions : undefined}
        dangerAction={dangerAction}
        meta={metaItems}
      >
        <div className="space-y-6">
          {/* Entry Details */}
          <FormSection title="Entry Details" columns={2}>
            <FormField label="Entry Number">
              <Input value={entry.entryNumber} disabled className="font-mono" />
            </FormField>
            <FormField label="Date">
              <DatePicker
                value={effectiveDate}
                onChange={(date) => setLocalDate(date)}
                disabled={!isDraft}
              />
            </FormField>
            <FormField label="Reference">
              <Input
                value={effectiveReference}
                onChange={(e) => setLocalReference(e.target.value)}
                disabled={!isDraft}
                placeholder="Optional reference"
              />
            </FormField>
            <FormField label="Source Type">
              <Input value={entry.sourceType} disabled />
            </FormField>
            <FormField label="Description" className="md:col-span-2">
              <Textarea
                value={effectiveDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                disabled={!isDraft}
                placeholder="Entry description"
                rows={3}
              />
            </FormField>
          </FormSection>

          {/* Journal Lines */}
          <FormSection title="Journal Lines" columns={1} collapsible={false}>
            <InlineGrid<LineRow>
              columns={gridColumns}
              rows={effectiveLines}
              onChange={(rows) => setLocalLines(rows as LineRow[])}
              onAddRow={handleAddLine}
              onRemoveRow={isDraft ? handleRemoveLine : undefined}
              footer={footerItems}
              disabled={!isDraft}
              minRows={2}
              addRowLabel="+ Add Line"
            />
          </FormSection>

          {/* Activity Timeline */}
          {timelineEvents.length > 0 && (
            <FormSection title="Activity" columns={1}>
              <Timeline events={timelineEvents} />
            </FormSection>
          )}

          {/* Reversed / Reversal info */}
          {isReversed && (
            <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              This entry has been reversed.
            </div>
          )}
        </div>
      </FormPage>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Journal Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {entry.entryNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
