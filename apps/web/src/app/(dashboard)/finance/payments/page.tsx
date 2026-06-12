'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePayments, type Payment } from '@/hooks/use-payments';

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  draft: 'bg-gray-100 text-gray-700',
  void: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

export default function PaymentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: payments, isLoading, error } = usePayments({ search: search || undefined });

  const list: Payment[] = Array.isArray(payments) ? payments : [];

  const totalReceived = list
    .filter((p) => p.type === 'received' && p.status !== 'void')
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
  const totalMade = list
    .filter((p) => p.type === 'made' && p.status !== 'void')
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground">Finance</Link>
            <span>/</span>
            <span>Payments</span>
          </div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Track incoming and outgoing payments</p>
        </div>
        <Button className="gap-1.5" onClick={() => router.push('/finance/payments/new')}>
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" /> Received
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceived)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <ArrowUpFromLine className="h-3.5 w-3.5 text-red-600" /> Made
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalMade)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Net</div>
            <div className="text-2xl font-bold">{formatCurrency(totalReceived - totalMade)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading payments...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>Unable to load payments.</p>
              <p className="text-xs mt-1">Please check your connection and try again.</p>
            </div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No payments found.</p>
              <p className="text-xs mt-1">Record your first payment to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payment #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Party</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => router.push(`/finance/payments/${p.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{p.paymentNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.type === 'received' ? 'default' : 'destructive'} className="text-[10px]">
                          {p.type === 'received' ? 'Received' : 'Made'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.partyName || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.paymentMethod || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {p.invoiceNumber || p.billNumber || p.reference || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatCurrency(parseFloat(p.amount || '0'))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[p.status] || statusColors.draft}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
