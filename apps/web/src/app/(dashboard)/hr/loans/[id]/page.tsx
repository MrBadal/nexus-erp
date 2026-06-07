'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, Trash2, Plus } from 'lucide-react';
import { StatusDot } from '@/components/ui/status-dot';
import {
  useLoan,
  useApproveLoan,
  useRejectLoan,
  useRecordRepayment,
  useDeleteLoan,
} from '@/hooks/use-loans';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'info',
  rejected: 'danger',
  closed: 'success',
  cancelled: 'danger',
};

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: loan, isLoading } = useLoan(id);
  const approve = useApproveLoan();
  const reject = useRejectLoan();
  const recordRepayment = useRecordRepayment();
  const deleteLoan = useDeleteLoan();

  const [repayment, setRepayment] = useState({
    amount: '',
    paidDate: new Date().toISOString().split('T')[0],
    note: '',
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!loan) {
    return <div className="p-6 text-center"><p className="text-muted-foreground">Loan not found</p></div>;
  }

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(repayment.amount);
    if (!(amount > 0)) {
      toast.error('Repayment amount must be greater than zero');
      return;
    }
    if (!repayment.paidDate) {
      toast.error('Paid date is required');
      return;
    }
    try {
      await recordRepayment.mutateAsync({
        id,
        data: {
          amount: amount.toFixed(2),
          paidDate: repayment.paidDate,
          note: repayment.note.trim() || undefined,
        },
      });
      toast.success('Repayment recorded');
      setRepayment({ amount: '', paidDate: new Date().toISOString().split('T')[0], note: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record repayment');
    }
  };

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(id);
      toast.success('Loan approved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve loan');
    }
  };

  const handleReject = async () => {
    try {
      await reject.mutateAsync(id);
      toast.success('Loan rejected');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject loan');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this loan? This cannot be undone.')) return;
    try {
      await deleteLoan.mutateAsync(id);
      toast.success('Loan deleted');
      router.push('/hr/loans');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete loan');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hr/loans">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{loan.loanNumber}</h1>
              <StatusDot status={statusVariant[loan.status] || 'info'} label={loan.status.charAt(0).toUpperCase() + loan.status.slice(1)} />
            </div>
            <p className="text-sm text-muted-foreground capitalize">{loan.type}{loan.employeeName ? ` · ${loan.employeeName}` : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {loan.status === 'pending' && (
            <>
              <Button onClick={handleApprove} disabled={approve.isPending}>
                <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={reject.isPending}>
                <XCircle className="mr-1.5 h-4 w-4" /> Reject
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleDelete} disabled={deleteLoan.isPending}>
            <Trash2 className="mr-1.5 h-4 w-4 text-destructive" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Principal</dt><dd className="font-mono font-medium">{formatCurrency(parseFloat(loan.principalAmount))}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Interest Rate</dt><dd className="font-mono">{loan.interestRate}%</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Installments</dt><dd className="font-mono">{loan.installmentsPaid} / {loan.installments}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">EMI</dt><dd className="font-mono font-medium">{formatCurrency(parseFloat(loan.emiAmount))}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Outstanding</dt><dd className="font-mono font-medium text-amber-600">{formatCurrency(parseFloat(loan.outstandingAmount))}</dd></div>
            {loan.disbursedDate && (
              <div className="flex justify-between"><dt className="text-muted-foreground">Disbursed</dt><dd>{formatDate(loan.disbursedDate)}</dd></div>
            )}
          </dl>
          {loan.reason && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
              <p className="text-sm whitespace-pre-wrap">{loan.reason}</p>
            </div>
          )}
        </div>

        {loan.status === 'approved' && (
          <div className="rounded-lg border bg-card p-6 space-y-3">
            <h2 className="text-lg font-semibold">Record Repayment</h2>
            <form onSubmit={handleRecordRepayment} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-right"
                  value={repayment.amount}
                  onChange={(e) => setRepayment({ ...repayment, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Paid Date</label>
                <input
                  type="date"
                  required
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={repayment.paidDate}
                  onChange={(e) => setRepayment({ ...repayment, paidDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Note</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={repayment.note}
                  onChange={(e) => setRepayment({ ...repayment, note: e.target.value })}
                  placeholder="Optional note..."
                />
              </div>
              <Button type="submit" disabled={recordRepayment.isPending} className="w-full">
                <Plus className="mr-1.5 h-4 w-4" /> {recordRepayment.isPending ? 'Recording...' : 'Record Repayment'}
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Repayment History</h2>
        {loan.repayments && loan.repayments.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Note</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loan.repayments.map((r, idx) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                  <td className="py-2 pr-4">{formatDate(r.paidDate)}</td>
                  <td className="py-2 pr-4">{r.note || '—'}</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(parseFloat(r.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">No repayments recorded yet.</p>
        )}
      </div>
    </div>
  );
}
