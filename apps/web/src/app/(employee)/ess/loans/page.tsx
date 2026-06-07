'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Landmark, Plus } from 'lucide-react';
import { useMyLoans, useApplyLoan, type LoanType } from '@/hooks/use-loans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatINR(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(n)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'closed':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default function EssLoansPage() {
  const { data, isLoading } = useMyLoans();
  const apply = useApplyLoan();

  const [showForm, setShowForm] = React.useState(false);
  const [type, setType] = React.useState<LoanType>('loan');
  const [principalAmount, setPrincipalAmount] = React.useState('');
  const [installments, setInstallments] = React.useState('1');
  const [interestRate, setInterestRate] = React.useState('0');
  const [reason, setReason] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const principal = parseFloat(principalAmount);
    const inst = parseInt(installments, 10);
    if (!(principal > 0)) {
      toast.error('Principal amount must be greater than zero');
      return;
    }
    if (!(inst >= 1)) {
      toast.error('Installments must be at least 1');
      return;
    }
    try {
      await apply.mutateAsync({
        type,
        principalAmount: principal.toFixed(2),
        interestRate: (parseFloat(interestRate) || 0).toFixed(2),
        installments: inst,
        reason: reason.trim() || undefined,
      });
      toast.success('Loan application submitted');
      setShowForm(false);
      setPrincipalAmount('');
      setInstallments('1');
      setInterestRate('0');
      setReason('');
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? 'Failed to submit application');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Loans &amp; Advances</h1>
          <p className="text-sm text-muted-foreground">
            Apply for and track your loans and salary advances.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="mr-1 h-4 w-4" />
          {showForm ? 'Close' : 'Apply'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                    value={type}
                    onChange={(e) => setType(e.target.value as LoanType)}
                  >
                    <option value="loan">Loan</option>
                    <option value="advance">Advance</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="principalAmount">Principal Amount</Label>
                  <Input
                    id="principalAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="installments">Installments</Label>
                  <Input
                    id="installments"
                    type="number"
                    min="1"
                    step="1"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Purpose of the loan or advance"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={apply.isPending}>
                  {apply.isPending ? 'Submitting…' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Landmark className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">My Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              You have no loans or advances yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">EMI</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.loanNumber}</TableCell>
                    <TableCell className="capitalize">{l.type}</TableCell>
                    <TableCell className="text-right">{formatINR(l.principalAmount)}</TableCell>
                    <TableCell className="text-right">{formatINR(l.emiAmount)}</TableCell>
                    <TableCell className="text-right">{formatINR(l.outstandingAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
