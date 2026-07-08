'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Phone,
  PhoneCall,
  ArrowLeft,
  ArrowRight,
  SkipForward,
  Clock,
  Keyboard,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useLeadQueue,
  useLeadQueueCounts,
  useLogCall,
  type Lead,
  type Disposition,
} from '@/hooks/use-crm';
import { apiErrorMessage } from '@/lib/api';

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

// Primary one-tap outcomes, keyed 1..6
const PRIMARY: { key: Disposition; label: string; hotkey: string; className: string }[] = [
  { key: 'connected', label: 'Connected', hotkey: '1', className: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { key: 'no_answer', label: 'No answer', hotkey: '2', className: 'bg-slate-600 hover:bg-slate-700 text-white' },
  { key: 'busy', label: 'Busy', hotkey: '3', className: 'bg-slate-600 hover:bg-slate-700 text-white' },
  { key: 'interested', label: 'Interested', hotkey: '4', className: 'bg-green-600 hover:bg-green-700 text-white' },
  { key: 'not_interested', label: 'Not interested', hotkey: '5', className: 'bg-orange-600 hover:bg-orange-700 text-white' },
  { key: 'callback', label: 'Callback', hotkey: '6', className: 'bg-amber-500 hover:bg-amber-600 text-white' },
];

const MORE: Disposition[] = ['switched_off', 'wrong_number', 'do_not_call'];

const REQUIRES_NOTES: Disposition[] = ['not_interested', 'do_not_call'];

// Callback presets — computed against the current wall clock via new Date().
const CALLBACK_PRESETS: { label: string; compute: () => Date }[] = [
  { label: 'In 1 hour', compute: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: 'In 3 hours', compute: () => new Date(Date.now() + 3 * 60 * 60 * 1000) },
  {
    label: 'Tomorrow 9am',
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    label: 'In 2 days',
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    label: 'In 1 week',
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
];

function formatFollowUp(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CallModePage() {
  // Build the calling queue by merging prioritised slices, de-duped by id.
  const overdue = useLeadQueue({ followUpDue: 'overdue', sort: 'followup' });
  const today = useLeadQueue({ followUpDue: 'today', sort: 'followup' });
  const mine = useLeadQueue({ mine: true, sort: 'followup' });
  const fresh = useLeadQueue({ status: 'new' });
  const { data: counts } = useLeadQueueCounts();
  const logCall = useLogCall();

  const isLoading =
    overdue.isLoading || today.isLoading || mine.isLoading || fresh.isLoading;

  const queue = useMemo<Lead[]>(() => {
    const seen = new Set<string>();
    const out: Lead[] = [];
    for (const slice of [overdue.data, today.data, mine.data, fresh.data]) {
      for (const lead of (slice as Lead[] | undefined) ?? []) {
        if (!seen.has(lead.id)) {
          seen.add(lead.id);
          out.push(lead);
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overdue.data, today.data, mine.data, fresh.data]);

  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [showCallback, setShowCallback] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [customFollowUp, setCustomFollowUp] = useState('');
  const [notesError, setNotesError] = useState(false);

  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  // Timestamp (ms) when the Call button was tapped for the current lead, else null.
  const callStartedAt = useRef<number | null>(null);

  const lead = queue[index];

  // Reset per-lead UI whenever we move to a different lead.
  const resetForLead = useCallback(() => {
    setNotes('');
    setShowCallback(false);
    setShowMore(false);
    setCustomFollowUp('');
    setNotesError(false);
    callStartedAt.current = null;
  }, []);

  const advance = useCallback(() => {
    resetForLead();
    setIndex((i) => i + 1);
  }, [resetForLead]);

  const goPrev = useCallback(() => {
    resetForLead();
    setIndex((i) => Math.max(0, i - 1));
  }, [resetForLead]);

  const computeDuration = useCallback((): number | undefined => {
    if (callStartedAt.current == null) return undefined;
    const mins = Math.round((Date.now() - callStartedAt.current) / 60000);
    return mins > 0 ? mins : undefined;
  }, []);

  const submit = useCallback(
    async (
      disposition: Disposition,
      extra?: { nextFollowUpAt?: string },
    ) => {
      if (!lead) return;
      const trimmedNotes = notes.trim();

      if (REQUIRES_NOTES.includes(disposition) && !trimmedNotes) {
        setNotesError(true);
        notesRef.current?.focus();
        toast.error('Add a quick reason in Notes for this outcome');
        return;
      }

      try {
        await logCall.mutateAsync({
          id: lead.id,
          disposition,
          notes: trimmedNotes || undefined,
          durationMinutes: computeDuration(),
          nextFollowUpAt: extra?.nextFollowUpAt,
        });
        toast.success(`Logged: ${dispositionLabels[disposition]} → next`);
        advance();
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Failed to log call'));
      }
    },
    [lead, notes, computeDuration, logCall, advance],
  );

  const handleDisposition = useCallback(
    (disposition: Disposition) => {
      if (disposition === 'callback') {
        setShowCallback(true);
        return;
      }
      void submit(disposition);
    },
    [submit],
  );

  const handleCallbackPreset = useCallback(
    (when: Date) => {
      void submit('callback', { nextFollowUpAt: when.toISOString() });
    },
    [submit],
  );

  const handleCustomCallback = useCallback(() => {
    if (!customFollowUp) {
      toast.error('Pick a date and time');
      return;
    }
    const when = new Date(customFollowUp);
    if (when.getTime() <= Date.now()) {
      toast.error('The callback must be in the future');
      return;
    }
    void submit('callback', { nextFollowUpAt: when.toISOString() });
  }, [customFollowUp, submit]);

  const startCall = useCallback(() => {
    callStartedAt.current = Date.now();
  }, []);

  // Keyboard shortcuts for power users.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === 'c' && !typing) {
        e.preventDefault();
        notesRef.current?.focus();
        return;
      }
      if (e.key === 'ArrowRight' && !typing) {
        e.preventDefault();
        advance();
        return;
      }
      if (typing) return;
      const match = PRIMARY.find((p) => p.hotkey === e.key);
      if (match) {
        e.preventDefault();
        handleDisposition(match.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance, handleDisposition]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Skeleton className="h-8 w-40" />
        <Card className="space-y-4 p-8">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      </div>
    );
  }

  // ── Empty / cleared queue ─────────────────────────────────────────────────
  if (queue.length === 0 || index >= queue.length) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold">Queue cleared — nice work!</h1>
        <p className="text-sm text-muted-foreground">
          {queue.length === 0
            ? 'There are no leads waiting to be called right now.'
            : `You worked through all ${queue.length} lead${queue.length === 1 ? '' : 's'}.`}
        </p>
        <div className="flex gap-2">
          <Link href="/crm/work-queue">
            <Button variant="outline">Back to Work Queue</Button>
          </Link>
          {queue.length > 0 && (
            <Button onClick={() => setIndex(0)}>Start over</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      {/* Header: back link, progress, counts */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/crm/work-queue">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="text-sm font-medium">
          Lead {index + 1} of {queue.length}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5 text-xs">
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">
            {counts?.overdue ?? 0} overdue
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
            {counts?.dueToday ?? 0} today
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
            {counts?.newUnassigned ?? 0} new
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      {/* Focused lead card */}
      <Card className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{lead.name}</h1>
            {lead.company && (
              <p className="text-sm text-muted-foreground">{lead.company}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              priorityColors[lead.priority] || priorityColors.low
            }`}
          >
            {lead.priority} priority
          </span>
        </div>

        {/* Big call button */}
        {lead.phone ? (
          <a
            href={`tel:${lead.phone}`}
            onClick={startCall}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-6 py-5 text-2xl font-bold tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PhoneCall className="h-7 w-7" />
            {lead.phone}
          </a>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/40 px-6 py-5 text-center text-sm text-muted-foreground">
            No phone number on this lead — skip or log an outcome.
          </div>
        )}

        {/* Compact meta */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Attempts</p>
            <p className="mt-0.5 font-semibold">{lead.callAttempts ?? 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last outcome</p>
            <p className="mt-0.5 font-semibold">
              {lead.lastDisposition ? dispositionLabels[lead.lastDisposition] : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Next follow-up</p>
            <p className="mt-0.5 font-semibold">{formatFollowUp(lead.nextFollowUpAt)}</p>
          </div>
        </div>

        {lead.notes && (
          <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
            {lead.notes}
          </p>
        )}

        {/* Notes input (always visible) */}
        <div className="space-y-1.5">
          <textarea
            ref={notesRef}
            rows={2}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (notesError && e.target.value.trim()) setNotesError(false);
            }}
            placeholder="Notes (optional) — press 'c' to focus"
            className={`w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
              notesError ? 'border-destructive ring-1 ring-destructive' : ''
            }`}
          />
          {notesError && (
            <p className="text-xs text-destructive">
              A short reason is required for this outcome.
            </p>
          )}
        </div>

        {/* One-tap disposition bar */}
        {!showCallback ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRIMARY.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handleDisposition(p.key)}
                  disabled={logCall.isPending}
                  className={`relative flex items-center justify-center rounded-md px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${p.className}`}
                >
                  {p.label}
                  <span className="absolute right-1.5 top-1 text-[10px] opacity-70">
                    {p.hotkey}
                  </span>
                </button>
              ))}
            </div>

            {/* More outcomes */}
            <div>
              <button
                onClick={() => setShowMore((s) => !s)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`}
                />
                More outcomes
              </button>
              {showMore && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {MORE.map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDisposition(d)}
                      disabled={logCall.isPending}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
                    >
                      {dispositionLabels[d]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Callback presets */
          <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
              <Clock className="h-4 w-4" />
              When should we call back?
            </div>
            <div className="flex flex-wrap gap-2">
              {CALLBACK_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleCallbackPreset(p.compute())}
                  disabled={logCall.isPending}
                  className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="datetime-local"
                value={customFollowUp}
                onChange={(e) => setCustomFollowUp(e.target.value)}
                className="max-w-[15rem] bg-background"
              />
              <Button size="sm" onClick={handleCustomCallback} disabled={logCall.isPending}>
                Custom
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCallback(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={index === 0}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" size="sm" onClick={advance}>
            <SkipForward className="mr-1 h-4 w-4" /> Skip
          </Button>
          <Button variant="ghost" size="sm" onClick={advance}>
            Next <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Shortcut legend */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Keyboard className="h-3.5 w-3.5" />
        <span>
          1 Connected · 2 No answer · 3 Busy · 4 Interested · 5 Not interested · 6 Callback ·
          c Notes · → Skip
        </span>
      </div>
    </div>
  );
}
