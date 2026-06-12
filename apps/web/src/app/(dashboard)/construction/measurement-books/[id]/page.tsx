'use client';

import { apiErrorMessage } from '@/lib/api';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMeasurementBook, useApproveMeasurementBook } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

export default function MeasurementBookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: mb, isLoading } = useMeasurementBook(id);
  const approveMutation = useApproveMeasurementBook();

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(id);
      toast('Measurement Book approved');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approval failed'));
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading measurement book...</div>
    );
  }

  if (!mb) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Measurement Book not found.{' '}
        <Link href="/construction/measurement-books" className="text-primary underline">
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
            <Link href="/construction/measurement-books" className="hover:text-foreground">Measurement Books</Link>
            <span>&rsaquo;</span>
            <span className="font-mono">{mb.mbNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{mb.mbNumber}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[mb.status] || 'bg-gray-100 text-gray-700'}`}
            >
              {mb.status}
            </span>
          </div>
        </div>
        {mb.status === 'draft' && (
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

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Contract</div>
            <Link href={`/construction/contracts/${mb.contractId}`} className="text-sm font-medium text-primary hover:underline">View Contract</Link>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Measurement Date</div>
            <div className="text-sm font-medium">{mb.measurementDate}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Measured By</div>
            <div className="text-sm font-medium">{mb.measuredBy || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Checked By</div>
            <div className="text-sm font-medium">{mb.checkedBy || '—'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      {mb.lines && mb.lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Measurement Lines</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">BOQ Item ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">L × B × H</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate (₹)</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {mb.lines.map((line) => (
                    <tr key={line.id} className="border-b">
                      <td className="px-4 py-3 font-mono text-xs">{line.boqItemId}</td>
                      <td className="px-4 py-3">{line.description || '—'}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                        {[line.length, line.breadth, line.height]
                          .filter(Boolean)
                          .join(' × ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {parseFloat(line.quantity || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        ₹{parseFloat(line.rate || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        ₹{parseFloat(line.amount || '0').toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={5} className="px-4 py-2 text-right text-sm font-semibold">Total</td>
                    <td className="px-4 py-2 text-right text-sm font-bold tabular-nums">
                      ₹{mb.lines
                        .reduce((s, l) => s + parseFloat(l.amount || '0'), 0)
                        .toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {mb.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{mb.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
