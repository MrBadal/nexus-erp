'use client';

import { apiErrorMessage } from '@/lib/api';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRaBill, useCertifyRaBill, useUpdateRaBillStatus } from '@/hooks/use-construction';
import { toast } from 'sonner';

// ─── Status config ─────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  certified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-purple-100 text-purple-700',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: string | number | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value || '0') : (value ?? 0);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(value: string | undefined | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function RaBillDetailPage() {
  const params = useParams<{ id: string }>();
  const billId = params.id;

  const { data: bill, isLoading, error } = useRaBill(billId);
  const certifyMutation = useCertifyRaBill();
  const statusMutation = useUpdateRaBillStatus();

  // Inline certifier input state
  const [showCertifierInput, setShowCertifierInput] = useState(false);
  const [certifierName, setCertifierName] = useState('');

  // ─── Action handlers ──────────────────────────────────────────────────────

  function handleSubmitForReview() {
    statusMutation.mutate(
      { id: billId, status: 'under_review' },
      {
        onSuccess: () => toast.success('RA Bill submitted for review'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to update status')),
      },
    );
  }

  function handleCertify() {
    const certifiedBy = certifierName.trim() || 'Site Engineer';
    certifyMutation.mutate(
      { id: billId, certifiedBy },
      {
        onSuccess: () => {
          toast.success('RA Bill certified — AR invoice posted to Finance GL');
          setShowCertifierInput(false);
          setCertifierName('');
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Certification failed')),
      },
    );
  }

  // ─── Loading / Error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-72 rounded bg-muted animate-pulse" />
        <div className="h-32 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading RA Bill' : 'RA Bill not found'}
          </p>
          <Link href="/construction/ra-bills" className="mt-2 text-sm text-primary underline">
            Back to RA Bills
          </Link>
        </div>
      </div>
    );
  }

  const status = bill.status;

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/construction" className="hover:text-foreground">
          Construction
        </Link>
        <span>&rsaquo;</span>
        <Link href="/construction/ra-bills" className="hover:text-foreground">
          RA Bills
        </Link>
        <span>&rsaquo;</span>
        <span>{bill.billNumber}</span>
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">RA Bill #{bill.billSequence}</h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[status] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {status.replace('_', ' ')}
          </span>
        </div>

        {/* Action buttons based on status */}
        <div className="flex items-center gap-2 flex-wrap">
          {status === 'draft' && (
            <Button
              variant="outline"
              onClick={handleSubmitForReview}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? 'Submitting…' : 'Submit for Review'}
            </Button>
          )}

          {status === 'under_review' && !showCertifierInput && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setShowCertifierInput(true)}
            >
              Certify Bill
            </Button>
          )}

          {status === 'under_review' && showCertifierInput && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Certifier name (e.g. Site Engineer)"
                value={certifierName}
                onChange={(e) => setCertifierName(e.target.value)}
                className="w-56 h-9"
                autoFocus
              />
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                onClick={handleCertify}
                disabled={certifyMutation.isPending}
              >
                {certifyMutation.isPending ? 'Certifying…' : 'Confirm Certify'}
              </Button>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => {
                  setShowCertifierInput(false);
                  setCertifierName('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Financial Summary (4 cards) ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Gross Amount
            </p>
            <p className="text-xl font-bold">₹{fmt(bill.grossAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Retention</p>
            <p className="text-xl font-bold text-amber-600">₹{fmt(bill.retentionAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              GST ({parseFloat(bill.gstRate || '0')}%)
            </p>
            <p className="text-xl font-bold text-blue-600">₹{fmt(bill.gstAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Net Payable
            </p>
            <p className="text-xl font-bold text-emerald-600">₹{fmt(bill.netPayable)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── GL Posting info (certified status) ──────────────────────────────── */}
      {status === 'certified' && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p className="font-semibold mb-0.5">Posted to Finance GL</p>
          <p>
            This RA Bill has been posted to Finance GL as an AR invoice. Journal Entry:{' '}
            <span className="font-mono">DR Accounts Receivable</span> /{' '}
            <span className="font-mono">CR Construction Revenue</span> /{' '}
            <span className="font-mono">CR GST Payable</span>
          </p>
        </div>
      )}

      {/* ── Bill Details card ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bill Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Bill Number</span>
              <span className="font-mono font-medium">{bill.billNumber}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Bill Date</span>
              <span>{fmtDate(bill.billDate)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Contract</span>
              <Link
                href={`/construction/contracts/${bill.contractId}`}
                className="font-mono text-primary hover:underline"
              >
                View Contract
              </Link>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Measurement Period</span>
              <span>
                {bill.measurementPeriodFrom ? fmtDate(bill.measurementPeriodFrom) : '—'} →{' '}
                {bill.measurementPeriodTo ? fmtDate(bill.measurementPeriodTo) : '—'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Previous Billed</span>
              <span className="font-mono">₹{fmt(bill.previousBilledAmount)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Current Bill</span>
              <span className="font-mono font-semibold">₹{fmt(bill.currentBillAmount)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Certified By</span>
              <span>{bill.certifiedBy || '—'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Certified At</span>
              <span>{bill.certifiedAt ? fmtDate(bill.certifiedAt) : '—'}</span>
            </div>
            {bill.notes && (
              <div className="md:col-span-2 flex flex-col gap-1 pt-1">
                <span className="text-muted-foreground">Notes</span>
                <p className="text-sm whitespace-pre-wrap">{bill.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Bill Lines table ─────────────────────────────────────────────────── */}
      {bill.lines && bill.lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bill Lines</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Prev Qty
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Current Qty
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Total Qty
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Rate (₹)
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Amount (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bill.lines.map((line) => (
                    <tr key={line.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">{line.description || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{line.unit}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {parseFloat(line.previousQuantity || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {parseFloat(line.currentQuantity || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {parseFloat(line.totalQuantity || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {fmt(line.rate)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        ₹{fmt(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={6} className="px-4 py-3 text-right font-semibold text-sm">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      ₹
                      {fmt(
                        bill.lines.reduce(
                          (sum, l) => sum + parseFloat(l.amount || '0'),
                          0,
                        ),
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Back link ────────────────────────────────────────────────────────── */}
      <div>
        <Link href="/construction/ra-bills" className="text-sm text-primary hover:underline">
          &larr; Back to RA Bills
        </Link>
      </div>
    </div>
  );
}
