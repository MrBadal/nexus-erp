'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  usePayment,
  useConfirmPayment,
  useVoidPayment,
} from '@/hooks/use-payments';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  draft: 'bg-gray-100 text-gray-700',
  void: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: payment, isLoading } = usePayment(id);
  const confirmMutation = useConfirmPayment();
  const voidMutation = useVoidPayment();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payment) {
    return <div className="p-6 text-center text-muted-foreground">Payment not found</div>;
  }

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync(id);
      toast.success('Payment confirmed');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm payment');
    }
  };

  const handleVoid = async () => {
    try {
      await voidMutation.mutateAsync(id);
      toast.success('Payment voided');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to void payment');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href="/finance" className="hover:text-foreground">Finance</Link>
              <span>/</span>
              <Link href="/finance/payments" className="hover:text-foreground">Payments</Link>
              <span>/</span>
              <span className="font-mono">{payment.paymentNumber}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{payment.paymentNumber}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  statusColors[payment.status] || statusColors.draft
                }`}
              >
                {payment.status}
              </span>
              <Badge variant={payment.type === 'received' ? 'default' : 'destructive'}>
                {payment.type === 'received' ? 'Received' : 'Made'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {(payment.status === 'draft' || payment.status === 'pending') && (
            <Button onClick={handleConfirm} disabled={confirmMutation.isPending}>
              <CheckCircle className="mr-1.5 h-4 w-4" /> Confirm
            </Button>
          )}
          {payment.status !== 'void' && (
            <Button variant="outline" onClick={handleVoid} disabled={voidMutation.isPending}>
              <XCircle className="mr-1.5 h-4 w-4" /> Void
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(payment.paymentDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-mono font-semibold">
                {formatCurrency(parseFloat(payment.amount || '0'), payment.currencyCode)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span>{payment.paymentMethod || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">{payment.reference || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Party & Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Party</span>
              <span className="font-medium">{payment.partyName || '-'}</span>
            </div>
            {payment.invoiceId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice</span>
                <Link
                  href={`/finance/invoices/${payment.invoiceId}`}
                  className="text-primary hover:underline font-mono text-xs"
                >
                  {payment.invoiceNumber || payment.invoiceId}
                </Link>
              </div>
            )}
            {payment.billId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bill</span>
                <Link
                  href={`/finance/bills/${payment.billId}`}
                  className="text-primary hover:underline font-mono text-xs"
                >
                  {payment.billNumber || payment.billId}
                </Link>
              </div>
            )}
            {payment.notes && (
              <div>
                <div className="text-muted-foreground mb-1">Notes</div>
                <div className="text-xs">{payment.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
