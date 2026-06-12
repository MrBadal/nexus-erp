'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, SendHorizonal, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDprs, useContracts, useSubmitDpr, useApproveDpr } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

export default function DprsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: dprs } = useDprs();
  const { data: contracts } = useContracts();
  const submitMutation = useSubmitDpr();
  const approveMutation = useApproveDpr();

  // Build contract lookup map
  const contractMap = new Map<string, string>();
  (contracts || []).forEach((c) => contractMap.set(c.id, c.contractNumber));

  const filtered = (dprs || []).filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.dprNumber.toLowerCase().includes(q) || (d.weather || '').toLowerCase().includes(q);
  });

  const totalDraft = filtered.filter((d) => d.status === 'draft').length;
  const totalSubmitted = filtered.filter((d) => d.status === 'submitted').length;
  const totalApproved = filtered.filter((d) => d.status === 'approved').length;

  const handleSubmit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await submitMutation.mutateAsync(id);
      toast('DPR submitted');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Submit failed'));
    }
  };

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await approveMutation.mutateAsync(id);
      toast('DPR approved');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approval failed'));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/construction" className="hover:text-foreground">Construction</Link>
            <span>&rsaquo;</span>
            <span>DPRs</span>
          </div>
          <h1 className="text-2xl font-bold">Daily Progress Reports</h1>
          <p className="text-sm text-muted-foreground">Track daily site activity, labour and progress</p>
        </div>
        <Link href="/construction/dprs/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> New DPR
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total DPRs</div>
            <div className="text-2xl font-bold">{filtered.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Draft</div>
            <div className="text-2xl font-bold text-gray-600">{totalDraft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Submitted</div>
            <div className="text-2xl font-bold text-amber-600">{totalSubmitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Approved</div>
            <div className="text-2xl font-bold text-emerald-600">{totalApproved}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search DPRs..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">DPR Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contract</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Weather</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Labour (S + U)</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dpr) => (
                  <tr
                    key={dpr.id}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/construction/dprs/${dpr.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{dpr.dprNumber}</td>
                    <td className="px-4 py-3">
                      {dpr.contractId ? (
                        <Link
                          href={`/construction/contracts/${dpr.contractId}`}
                          className="font-mono text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {contractMap.get(dpr.contractId) || 'View Contract'}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{dpr.reportDate}</td>
                    <td className="px-4 py-3">{dpr.weather || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {dpr.skilledLabour} + {dpr.unskilledLabour}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[dpr.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {dpr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {dpr.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={(e) => handleSubmit(e, dpr.id)}
                          disabled={submitMutation.isPending}
                        >
                          <SendHorizonal className="h-3 w-3 mr-1" />
                          Submit
                        </Button>
                      )}
                      {dpr.status === 'submitted' && (
                        <Button
                          size="sm"
                          className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={(e) => handleApprove(e, dpr.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No DPRs found.{' '}
                      <Link href="/construction/dprs/new" className="text-primary underline">
                        Create the first DPR
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
