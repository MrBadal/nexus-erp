'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, Search, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useLeadQueue,
  useLeadQueueCounts,
  useAssignLeadToMe,
  type Lead,
  type LeadQueueParams,
  type Disposition,
} from '@/hooks/use-crm';
import { apiErrorMessage } from '@/lib/api';

type TabKey = 'today' | 'overdue' | 'unassigned' | 'mine';

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

const TAB_PARAMS: Record<TabKey, LeadQueueParams> = {
  today: { followUpDue: 'today', sort: 'followup' },
  overdue: { followUpDue: 'overdue', sort: 'followup' },
  unassigned: { status: 'new' },
  mine: { mine: true, sort: 'followup' },
};

const EMPTY_MESSAGE: Record<TabKey, string> = {
  today: 'Nothing due today — nice work!',
  overdue: 'No overdue follow-ups. All caught up!',
  unassigned: 'No unassigned leads to claim right now.',
  mine: 'No leads assigned to you yet.',
};

function formatFollowUp(value: string | null): { text: string; overdue: boolean } {
  if (!value) return { text: '—', overdue: false };
  const d = new Date(value);
  const overdue = d.getTime() < Date.now();
  const text = d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return { text, overdue };
}

export default function WorkQueuePage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('today');
  const [search, setSearch] = useState('');

  const { data: counts } = useLeadQueueCounts();
  const assignToMe = useAssignLeadToMe();

  const queryParams = useMemo<LeadQueueParams>(
    () => ({ ...TAB_PARAMS[tab], search: search || undefined }),
    [tab, search],
  );
  const { data, isLoading } = useLeadQueue(queryParams);

  const leads = useMemo(() => {
    const rows = (data as Lead[] | undefined) ?? [];
    // New/Unassigned tab: the backend returns own + unassigned for reps,
    // so filter to only the claimable (unassigned) pool client-side.
    return tab === 'unassigned' ? rows.filter((l) => l.assignedTo === null) : rows;
  }, [data, tab]);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'today', label: 'Due Today', count: counts?.dueToday },
    { key: 'overdue', label: 'Overdue', count: counts?.overdue },
    { key: 'unassigned', label: 'New / Unassigned', count: counts?.newUnassigned },
    { key: 'mine', label: 'All Mine', count: counts?.mine },
  ];

  const handleClaim = async (id: string) => {
    try {
      await assignToMe.mutateAsync(id);
      toast.success('Lead claimed');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to claim lead'));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">My Work Queue</h1>
        <p className="text-sm text-muted-foreground">Your daily calling list, prioritised.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background hover:bg-accent'
            }`}
          >
            {t.label}
            <span
              className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs ${
                tab === t.key ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t.count ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Next follow-up</th>
                <th className="px-4 py-3 font-medium">Last disposition</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {tab === 'unassigned' && <th className="px-4 py-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [0, 1, 2, 3].map((i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3" colSpan={tab === 'unassigned' ? 7 : 6}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                    colSpan={tab === 'unassigned' ? 7 : 6}
                  >
                    {EMPTY_MESSAGE[tab]}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const followUp = formatFollowUp(lead.nextFollowUpAt);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/crm/leads/${lead.id}`)}
                      className="cursor-pointer border-b transition-colors hover:bg-accent/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{lead.name}</div>
                        {lead.company && (
                          <div className="text-xs text-muted-foreground">{lead.company}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-primary hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityColors[lead.priority] || priorityColors.low}`}>
                          {lead.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={followUp.overdue ? 'font-medium text-red-600' : ''}>
                          {followUp.overdue ? 'Overdue' : followUp.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {lead.lastDisposition ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dispositionColors[lead.lastDisposition]}`}>
                            {dispositionLabels[lead.lastDisposition]}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                          {lead.status}
                        </span>
                      </td>
                      {tab === 'unassigned' && (
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={assignToMe.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaim(lead.id);
                            }}
                          >
                            <UserPlus className="mr-1 h-3.5 w-3.5" /> Claim
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
