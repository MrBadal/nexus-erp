'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Search,
  Sparkles,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useFinderStates,
  useCandidates,
  useCandidateCounts,
  useDiscoverLeads,
  useApproveCandidates,
  useRejectCandidates,
  useEnrichState,
  type DiscoverResult,
} from '@/hooks/use-crm';
import { useUsers, useRoles } from '@/hooks/use-settings';
import { apiErrorMessage } from '@/lib/api';

const UNASSIGNED = '__unassigned__';
const ROUND_ROBIN = '__round_robin__';

type Tab = 'new' | 'imported' | 'rejected';

export default function LeadFinderPage() {
  const { data: states } = useFinderStates();
  const { data: users } = useUsers();
  const { data: roles } = useRoles();

  const [state, setState] = useState<string>('');
  const [assignTo, setAssignTo] = useState<string>(UNASSIGNED);
  const [tab, setTab] = useState<Tab>('new');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastRun, setLastRun] = useState<DiscoverResult | null>(null);

  const discover = useDiscoverLeads();
  const approve = useApproveCandidates();
  const reject = useRejectCandidates();
  const enrich = useEnrichState();

  const { data: candidates, isLoading: loadingCands } = useCandidates({ status: tab });
  const { data: counts } = useCandidateCounts();

  const telecallers = useMemo(() => {
    const ids = new Set((roles ?? []).filter((r) => r.slug === 'telecaller').map((r) => r.id));
    return (users ?? []).filter((u) => u.roleId && ids.has(u.roleId));
  }, [users, roles]);

  const resolveAssignTo = (): string | null | 'round_robin' => {
    if (assignTo === UNASSIGNED) return null;
    if (assignTo === ROUND_ROBIN) return 'round_robin';
    return assignTo;
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const rows = candidates ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const runDiscover = async (offset = 0) => {
    if (!state) {
      toast.error('Pick a state first');
      return;
    }
    try {
      const res = await discover.mutateAsync({ state, offset, maxScan: 1500 });
      setLastRun(res);
      setTab('new');
      toast.success(
        `${res.producersFound} producer companies found · ${res.created} new added${
          res.alreadyHave ? ` · ${res.alreadyHave} already yours` : ''
        }${res.enriched ? ` · ${res.enriched} enriched` : ''}`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Discovery failed'));
    }
  };

  const runEnrich = async () => {
    if (!state) {
      toast.error('Pick a state first');
      return;
    }
    try {
      const res = await enrich.mutateAsync({ state });
      toast.success(
        `Enriched ${res.updated} of ${res.leadsInState} leads in ${res.state}${
          res.struckOff ? ` · flagged ${res.struckOff} struck-off` : ''
        }`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Enrichment failed'));
    }
  };

  const runApprove = async () => {
    if (selected.size === 0) return;
    try {
      const res = await approve.mutateAsync({
        ids: [...selected],
        assignTo: resolveAssignTo(),
      });
      setSelected(new Set());
      toast.success(
        `Added ${res.approved} lead${res.approved === 1 ? '' : 's'}${
          res.skipped ? ` · ${res.skipped} skipped (already present)` : ''
        }`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approve failed'));
    }
  };

  const runReject = async () => {
    if (selected.size === 0) return;
    try {
      const res = await reject.mutateAsync({ ids: [...selected] });
      setSelected(new Set());
      toast.success(`Rejected ${res.rejected}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Reject failed'));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/crm/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Lead Finder</h1>
          <p className="text-sm text-muted-foreground">
            Discover new Farmer Producer Companies from the public MCA registry, and enrich your
            existing leads with CIN &amp; company status.
          </p>
        </div>
      </div>

      {/* Source note */}
      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Source: <strong>Ministry of Corporate Affairs</strong> company registry (data.gov.in) —
          free public data. We scan agriculture-classified companies in a state and keep the
          producer companies. Phone numbers are rarely in the registry; you&apos;ll get the company
          name, registered address, CIN and active/struck-off status.
        </p>
      </div>

      {/* Discover controls */}
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Find FPOs by state</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full max-w-xs space-y-1.5">
            <Label>State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger>
                <SelectValue placeholder="Select a state…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {(states ?? []).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => runDiscover(0)} disabled={discover.isPending || !state}>
            {discover.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-1.5 h-4 w-4" />
            )}
            {discover.isPending ? 'Scanning…' : 'Find FPOs'}
          </Button>
          <Button variant="outline" onClick={runEnrich} disabled={enrich.isPending || !state}>
            {enrich.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            Enrich existing leads
          </Button>
        </div>

        {lastRun && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md bg-muted p-3 text-sm">
            <span>
              Scanned <strong>{lastRun.scanned}</strong> of {lastRun.totalAgriInState} agri
              companies in {lastRun.state}
            </span>
            <span className="text-emerald-700">
              <strong>{lastRun.created}</strong> new candidates
            </span>
            <span className="text-muted-foreground">{lastRun.alreadyHave} already yours</span>
            {lastRun.hasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => runDiscover(lastRun.nextOffset)}
                disabled={discover.isPending}
              >
                Scan more →
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Candidate review */}
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(['new', 'imported', 'rejected'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setSelected(new Set());
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t} {counts ? `(${counts[t]})` : ''}
              </button>
            ))}
          </div>

          {tab === 'new' && selected.size > 0 && (
            <div className="flex items-center gap-2">
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger className="h-9 w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned pool</SelectItem>
                  <SelectItem value={ROUND_ROBIN}>Round-robin telecallers</SelectItem>
                  {telecallers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {`${u.firstName} ${u.lastName}`.trim() || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={runApprove} disabled={approve.isPending}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Add {selected.size} to leads
              </Button>
              <Button size="sm" variant="outline" onClick={runReject} disabled={reject.isPending}>
                <XCircle className="mr-1.5 h-4 w-4" />
                Reject
              </Button>
            </div>
          )}
        </div>

        {loadingCands ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Building2 className="h-8 w-8" />
            <p className="text-sm">
              {tab === 'new'
                ? 'No candidates yet. Pick a state and hit “Find FPOs”.'
                : `No ${tab} candidates.`}
            </p>
          </div>
        ) : (
          <div className="max-h-[32rem] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {tab === 'new' && (
                    <th className="w-10 px-3 py-2">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </th>
                  )}
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">District</th>
                  <th className="px-3 py-2 font-medium">CIN</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const struck = /strike/i.test(c.companyStatus || '');
                  return (
                    <tr key={c.id} className="border-t align-top">
                      {tab === 'new' && (
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggle(c.id)}
                          />
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <div className="font-medium">{c.name}</div>
                        {c.address && (
                          <div className="max-w-md truncate text-xs text-muted-foreground">
                            {c.address}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">{c.city || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{c.cin || '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            struck
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.companyStatus || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {c.registrationDate || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
