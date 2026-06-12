'use client';

import { apiErrorMessage } from '@/lib/api';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PackageMinus, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMaterialIssue, useApproveMaterialIssue } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

export default function MaterialIssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: issue, isLoading } = useMaterialIssue(id);
  const approveMutation = useApproveMaterialIssue();

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(id);
      toast('Material issued — inventory reduced & job cost posted to Finance GL');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approval failed'));
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading material issue...</div>;
  }

  if (!issue) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Material Issue not found.{' '}
        <Link href="/construction/material-issues" className="text-primary underline">
          Back to list
        </Link>
      </div>
    );
  }

  const totalValue = parseFloat(issue.totalValue || '0');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/construction" className="hover:text-foreground">Construction</Link>
            <span>&rsaquo;</span>
            <Link href="/construction/material-issues" className="hover:text-foreground">Material Issues</Link>
            <span>&rsaquo;</span>
            <span className="font-mono">{issue.issueNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{issue.issueNumber}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[issue.status] || 'bg-gray-100 text-gray-700'}`}
            >
              {issue.status}
            </span>
          </div>
        </div>
        {issue.status === 'draft' && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
          >
            <PackageMinus className="h-4 w-4" />
            Approve &amp; Issue
          </Button>
        )}
      </div>

      {/* GL Journal Notice (approved only) */}
      {issue.status === 'approved' && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-0.5">Inventory stock reduced.</p>
            <p>GL journal posted: <span className="font-mono">DR Construction WIP / CR Inventory Asset</span></p>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Contract</div>
              <Link href={`/construction/contracts/${issue.contractId}`} className="text-sm font-medium font-mono text-primary hover:underline">View Contract</Link>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Issue Date</div>
              <div className="text-sm font-medium">{issue.issueDate}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Warehouse</div>
              <div className="text-sm font-medium">Warehouse</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Issued To</div>
              <div className="text-sm font-medium">{issue.issuedTo || '—'}</div>
            </div>
            {issue.notes && (
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground mb-0.5">Notes</div>
                <div className="text-sm text-muted-foreground">{issue.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Total Lines</span>
              <span className="text-sm font-medium">{(issue.lines || []).length}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-semibold">Total Value</span>
              <span className="text-xl font-bold">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lines */}
      {issue.lines && issue.lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Material Lines</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item Description</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty Issued</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Unit Rate (₹)</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {issue.lines.map((line) => (
                    <tr key={line.id} className="border-b">
                      <td className="px-4 py-3">{line.itemDescription || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{line.unit}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {parseFloat(line.quantityIssued || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        ₹{parseFloat(line.unitRate || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        ₹{parseFloat(line.amount || '0').toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="px-4 py-2 text-right text-sm font-semibold">Total</td>
                    <td className="px-4 py-2 text-right text-sm font-bold tabular-nums">
                      ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
