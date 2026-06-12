'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, CheckCircle, XCircle, Banknote } from 'lucide-react';
import { StatusDot } from '@/components/ui/status-dot';
import {
  useExpenseClaim,
  useSubmitExpenseClaim,
  useApproveExpenseClaim,
  useRejectExpenseClaim,
  usePayExpenseClaim,
} from '@/hooks/use-hr';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  submitted: 'info',
  approved: 'success',
  rejected: 'danger',
  paid: 'success',
  cancelled: 'danger',
};

export default function ExpenseClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: claim, isLoading } = useExpenseClaim(id);
  const submitClaim = useSubmitExpenseClaim();
  const approveClaim = useApproveExpenseClaim();
  const rejectClaim = useRejectExpenseClaim();
  const payClaim = usePayExpenseClaim();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!claim) {
    return <div className="p-6 text-center"><p className="text-muted-foreground">Expense claim not found</p></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hr/expense-claims">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{claim.claimNumber}</h1>
              <StatusDot status={statusVariant[claim.status] || 'info'} label={claim.status.charAt(0).toUpperCase() + claim.status.slice(1)} />
            </div>
            <p className="text-sm text-muted-foreground">{claim.purpose || 'Expense Claim'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {claim.status === 'draft' && (
            <Button variant="outline" onClick={() => submitClaim.mutate(id)} disabled={submitClaim.isPending}>
              <Send className="mr-1.5 h-4 w-4" /> Submit
            </Button>
          )}
          {claim.status === 'submitted' && (
            <>
              <Button onClick={() => approveClaim.mutate(id)} disabled={approveClaim.isPending}>
                <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
              </Button>
              <Button variant="destructive" onClick={() => rejectClaim.mutate(id)} disabled={rejectClaim.isPending}>
                <XCircle className="mr-1.5 h-4 w-4" /> Reject
              </Button>
            </>
          )}
          {claim.status === 'approved' && (
            <Button onClick={() => payClaim.mutate(id)} disabled={payClaim.isPending}>
              <Banknote className="mr-1.5 h-4 w-4" /> Mark as Paid
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Claim Date</dt><dd>{formatDate(claim.claimDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Total Amount</dt><dd className="font-mono font-medium">{formatCurrency(parseFloat(claim.totalAmount))}</dd></div>
            {claim.approvedAmount !== '0' && claim.approvedAmount !== '0.0000' && (
              <div className="flex justify-between"><dt className="text-muted-foreground">Approved Amount</dt><dd className="font-mono font-medium text-green-600">{formatCurrency(parseFloat(claim.approvedAmount))}</dd></div>
            )}
          </dl>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Expense Lines</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4">#</th>
              <th className="pb-2 pr-4">Date</th>
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2 pr-4">Description</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {claim.lines?.map((line, idx) => (
              <tr key={line.id} className="border-b last:border-0">
                <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                <td className="py-2 pr-4">{formatDate(line.expenseDate)}</td>
                <td className="py-2 pr-4 font-medium">{line.category}</td>
                <td className="py-2 pr-4">{line.description || '\u2014'}</td>
                <td className="py-2 text-right font-mono">{formatCurrency(parseFloat(line.amount))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td colSpan={4} className="py-2 text-right">Total</td>
              <td className="py-2 text-right font-mono">{formatCurrency(parseFloat(claim.totalAmount))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {claim.notes && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{claim.notes}</p>
        </div>
      )}
    </div>
  );
}
