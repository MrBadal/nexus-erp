'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { get, put, endpoints, apiErrorMessage } from '@/lib/api';
import { SiteGrn } from '@/hooks/use-construction';
import { useApproveSiteGrn } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-500',
};

function DetailRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-2 gap-2 py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function SiteGrnDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');
  const qc = useQueryClient();

  const { data: grn, isLoading } = useQuery({
    queryKey: ['site-grns', id],
    queryFn: () => get<SiteGrn>(endpoints.siteGrns.get(id)),
    enabled: !!id,
  });

  const approveMutation = useApproveSiteGrn();

  const submitMutation = useMutation({
    mutationFn: () => put<SiteGrn>(endpoints.siteGrns.submit(id), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-grns'] });
      toast.success('Site GRN submitted for approval.');
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Failed to submit Site GRN. Please try again.'));
    },
  });

  const handleApprove = () => {
    approveMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Site GRN approved — inventory updated & accrual journal posted to Finance GL');
      },
      onError: (err) => {
        toast.error(apiErrorMessage(err, 'Approval failed. Please try again.'));
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-10 w-72 bg-muted rounded" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Site GRN not found.</p>
        <Link href="/construction/site-grns" className="text-primary underline text-sm mt-2 inline-block">
          Back to Site GRNs
        </Link>
      </div>
    );
  }

  const totalValue = parseFloat(grn.totalValue || '0');
  const lines = grn.lines ?? [];
  const linesTotal = lines.reduce((sum, l) => sum + parseFloat(l.amount || '0'), 0);

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/construction" className="hover:text-foreground">Construction</Link>
            <span>&rsaquo;</span>
            <Link href="/construction/site-grns" className="hover:text-foreground">Site GRNs</Link>
            <span>&rsaquo;</span>
            <span className="font-mono">{grn.grnNumber}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">Site GRN</h1>
            <span className="font-mono text-xl text-muted-foreground">{grn.grnNumber}</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[grn.status] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {grn.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {grn.status === 'draft' && (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              variant="outline"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          )}
          {grn.status === 'submitted' && (
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* GRN Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">GRN Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <div className="grid grid-cols-2 gap-2 py-1.5 border-b">
              <span className="text-sm text-muted-foreground">Contract</span>
              <Link href={`/construction/contracts/${grn.contractId}`} className="text-sm font-medium text-primary hover:underline">View Contract</Link>
            </div>
            <DetailRow label="GRN Date" value={grn.grnDate} />
            <DetailRow label="Supplier" value={grn.supplierName} />
            <DetailRow label="Vehicle / Challan No." value={grn.vehicleNumber} />
            <DetailRow label="Supplier Challan No." value={grn.challanNumber} />
            {grn.warehouseId && <DetailRow label="Site Warehouse" value="Assigned" />}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Total Value</span>
              <span className="text-xl font-bold tabular-nums">
                ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {grn.status === 'approved' && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="font-medium mb-1">Inventory stock updated.</p>
                <p className="text-xs text-emerald-700">
                  Finance accrual entry: <span className="font-mono">DR Inventory Asset / CR Accounts Payable</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Material Lines */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Material Lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty Received</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty Rejected</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net Accepted</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Unit Rate (₹)</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground text-sm">
                      No material lines recorded.
                    </td>
                  </tr>
                )}
                {lines.map((line, idx) => {
                  const received = parseFloat(line.quantityReceived || '0');
                  const rejected = parseFloat(line.quantityRejected || '0');
                  const netAccepted = received - rejected;
                  const rate = parseFloat(line.unitRate || '0');
                  const amount = parseFloat(line.amount || '0');

                  return (
                    <tr key={line.id ?? idx} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3">{line.itemDescription || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{line.unit}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {received.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600">
                        {rejected > 0 ? rejected.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {netAccepted.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        ₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {lines.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td colSpan={6} className="px-4 py-3 text-right text-sm">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm">
                      ₹{linesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {grn.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{grn.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
