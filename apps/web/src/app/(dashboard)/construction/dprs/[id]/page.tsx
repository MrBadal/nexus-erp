'use client';

import { apiErrorMessage } from '@/lib/api';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SendHorizonal, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDpr, useSubmitDpr, useApproveDpr } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

export default function DprDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: dpr, isLoading } = useDpr(id);
  const submitMutation = useSubmitDpr();
  const approveMutation = useApproveDpr();

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync(id);
      toast('DPR submitted');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Submit failed'));
    }
  };

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(id);
      toast('DPR approved');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approval failed'));
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading DPR...</div>;
  }

  if (!dpr) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        DPR not found.{' '}
        <Link href="/construction/dprs" className="text-primary underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/construction" className="hover:text-foreground">Construction</Link>
            <span>&rsaquo;</span>
            <Link href="/construction/dprs" className="hover:text-foreground">DPRs</Link>
            <span>&rsaquo;</span>
            <span className="font-mono">{dpr.dprNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold font-mono">{dpr.dprNumber}</h1>
              <p className="text-sm text-muted-foreground">{dpr.reportDate}</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[dpr.status] || 'bg-gray-100 text-gray-700'}`}
            >
              {dpr.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {dpr.status === 'draft' && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
            >
              <SendHorizonal className="h-4 w-4" />
              Submit
            </Button>
          )}
          {dpr.status === 'submitted' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
          )}
        </div>
      </div>

      {/* Labour Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Skilled Labour</div>
            <div className="text-3xl font-bold">{dpr.skilledLabour}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Unskilled Labour</div>
            <div className="text-3xl font-bold">{dpr.unskilledLabour}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Supervisors</div>
            <div className="text-3xl font-bold">{dpr.supervisors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Engineers</div>
            <div className="text-3xl font-bold">{dpr.engineers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Site Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site Conditions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Weather</div>
            <div className="text-sm font-medium">{dpr.weather || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Temperature</div>
            <div className="text-sm font-medium">{dpr.temperature || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Visitors on Site</div>
            <div className="text-sm font-medium">{dpr.visitorsOnSite || '—'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Notes */}
      <div className="grid gap-4 md:grid-cols-2">
        {dpr.workDoneToday && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Work Done Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{dpr.workDoneToday}</p>
            </CardContent>
          </Card>
        )}
        {dpr.issuesObserved && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Issues Observed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{dpr.issuesObserved}</p>
            </CardContent>
          </Card>
        )}
        {dpr.nextDayPlan && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next Day Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{dpr.nextDayPlan}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Work Items */}
      {dpr.workItems && dpr.workItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty Today</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cumulative Qty</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {dpr.workItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {parseFloat(item.quantityToday || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {parseFloat(item.cumulativeQuantity || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
