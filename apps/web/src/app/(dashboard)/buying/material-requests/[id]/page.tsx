'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, CheckCircle, XCircle, ShoppingCart } from 'lucide-react';
import { StatusDot } from '@/components/ui/status-dot';
import {
  useMaterialRequest,
  useSubmitMR,
  useApproveMR,
  useRejectMR,
  useConvertMRToPO,
} from '@/hooks/use-buying';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  submitted: 'info',
  approved: 'success',
  partially_ordered: 'warning',
  ordered: 'success',
  rejected: 'danger',
  cancelled: 'danger',
};

export default function MaterialRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: mr, isLoading } = useMaterialRequest(id);
  const submitMR = useSubmitMR();
  const approveMR = useApproveMR();
  const rejectMR = useRejectMR();
  const convertToPO = useConvertMRToPO();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!mr) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Material request not found</p>
      </div>
    );
  }

  const statusLabel = mr.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/buying/material-requests">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{mr.requestNumber}</h1>
              <StatusDot status={statusVariant[mr.status] || 'info'} label={statusLabel} />
              {mr.isPendingApproval && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground capitalize">{mr.requestType} request</p>
          </div>
        </div>
        <div className="flex gap-2">
          {mr.status === 'draft' && (
            <Button
              variant="outline"
              onClick={() => submitMR.mutate(id)}
              disabled={submitMR.isPending}
            >
              <Send className="mr-1.5 h-4 w-4" />
              Submit
            </Button>
          )}
          {mr.status === 'submitted' && (
            <>
              <Button
                onClick={() => approveMR.mutate(id)}
                disabled={approveMR.isPending}
              >
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectMR.mutate(id)}
                disabled={rejectMR.isPending}
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {(mr.status === 'approved' || mr.status === 'partially_ordered') && (
            <Button
              onClick={() => convertToPO.mutate(id)}
              disabled={convertToPO.isPending}
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Convert to PO
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Request Date</dt>
              <dd>{formatDate(mr.requestDate)}</dd>
            </div>
            {mr.requiredDate && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Required By</dt>
                <dd>{formatDate(mr.requiredDate)}</dd>
              </div>
            )}
            {mr.department && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Department</dt>
                <dd>{mr.department}</dd>
              </div>
            )}
          </dl>
        </div>
        {mr.purpose && (
          <div className="rounded-lg border bg-card p-6 space-y-3">
            <h2 className="text-lg font-semibold">Purpose</h2>
            <p className="text-sm">{mr.purpose}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Item</th>
                <th className="pb-2 pr-4 text-right">Quantity</th>
                <th className="pb-2 pr-4 text-right">Ordered</th>
                <th className="pb-2 pr-4">UoM</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {mr.lines?.map((line, idx) => {
                const qty = parseFloat(line.quantity);
                const ordered = parseFloat(line.orderedQty);
                const fulfilled = ordered >= qty;
                return (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2 pr-4">
                      <span className="font-medium">{line.itemName || 'Unknown'}</span>
                      {line.itemCode && <span className="ml-2 text-muted-foreground">({line.itemCode})</span>}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">{qty}</td>
                    <td className="py-2 pr-4 text-right font-mono">{ordered}</td>
                    <td className="py-2 pr-4">{line.uom}</td>
                    <td className="py-2">
                      {fulfilled ? (
                        <span className="text-green-600 font-medium">Ordered</span>
                      ) : ordered > 0 ? (
                        <span className="text-amber-500 font-medium">Partial</span>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {mr.notes && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{mr.notes}</p>
        </div>
      )}
    </div>
  );
}
