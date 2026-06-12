'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRaBill, useContracts } from '@/hooks/use-construction';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function fmt(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewRaBillPage() {
  const router = useRouter();
  const createMutation = useCreateRaBill();
  const { data: contracts } = useContracts();

  // Bill Details
  const [contractId, setContractId] = useState('');
  const [billDate, setBillDate] = useState(todayIso());
  const [measurementPeriodFrom, setMeasurementPeriodFrom] = useState('');
  const [measurementPeriodTo, setMeasurementPeriodTo] = useState('');

  // Bill Amounts
  const [grossAmountStr, setGrossAmountStr] = useState('');
  const [retentionAmountStr, setRetentionAmountStr] = useState('');
  const [gstRateStr, setGstRateStr] = useState('12');

  // Notes
  const [notes, setNotes] = useState('');

  // ─── Live preview calculations ──────────────────────────────────────────────

  const preview = useMemo(() => {
    const gross = parseFloat(grossAmountStr || '0');
    const retention = parseFloat(retentionAmountStr || '0');
    const gstRate = parseFloat(gstRateStr || '0');
    const subTotal = gross - retention;
    const gstAmount = subTotal * (gstRate / 100);
    const netPayable = subTotal + gstAmount;
    return { gross, retention, subTotal, gstAmount, netPayable, gstRate };
  }, [grossAmountStr, retentionAmountStr, gstRateStr]);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!contractId) {
      toast.error('Please select a contract');
      return;
    }
    if (!billDate) {
      toast.error('Bill date is required');
      return;
    }
    if (!grossAmountStr || parseFloat(grossAmountStr) <= 0) {
      toast.error('Gross bill amount is required');
      return;
    }

    createMutation.mutate(
      {
        contractId,
        billDate,
        measurementPeriodFrom: measurementPeriodFrom || undefined,
        measurementPeriodTo: measurementPeriodTo || undefined,
        grossAmount: grossAmountStr,
        retentionAmount: retentionAmountStr || '0',
        gstRate: gstRateStr || '12',
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('RA Bill created successfully');
          router.push('/construction/ra-bills');
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to create RA Bill'));
        },
      },
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/construction" className="hover:text-foreground">
            Construction
          </Link>
          <span>&rsaquo;</span>
          <Link href="/construction/ra-bills" className="hover:text-foreground">
            RA Bills
          </Link>
          <span>&rsaquo;</span>
          <span>New RA Bill</span>
        </div>
        <h1 className="text-2xl font-bold">New RA Bill</h1>
        <p className="text-sm text-muted-foreground">
          Create a Running Account Bill for progress billing against a construction contract.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section: Bill Details ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bill Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contract */}
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="contractId">
                Contract <span className="text-destructive">*</span>
              </Label>
              <Select value={contractId} onValueChange={setContractId}>
                <SelectTrigger id="contractId">
                  <SelectValue placeholder="Select a contract…" />
                </SelectTrigger>
                <SelectContent>
                  {(contracts || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contractNumber} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bill Date */}
            <div className="space-y-1.5">
              <Label htmlFor="billDate">
                Bill Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="billDate"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                required
              />
            </div>

            {/* Spacer on larger screens */}
            <div className="hidden md:block" />

            {/* Measurement Period From */}
            <div className="space-y-1.5">
              <Label htmlFor="measurementPeriodFrom">Measurement Period From</Label>
              <Input
                id="measurementPeriodFrom"
                type="date"
                value={measurementPeriodFrom}
                onChange={(e) => setMeasurementPeriodFrom(e.target.value)}
              />
            </div>

            {/* Measurement Period To */}
            <div className="space-y-1.5">
              <Label htmlFor="measurementPeriodTo">Measurement Period To</Label>
              <Input
                id="measurementPeriodTo"
                type="date"
                value={measurementPeriodTo}
                onChange={(e) => setMeasurementPeriodTo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Section: Bill Amounts ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bill Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Info banner */}
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Enter <strong>TOTAL quantities to date</strong>. The system will auto-calculate the
              current bill amount based on previous billing recorded against this contract.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gross Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="grossAmount">
                  Gross Bill Amount (₹) — Total cumulative to date{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="grossAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={grossAmountStr}
                  onChange={(e) => setGrossAmountStr(e.target.value)}
                  required
                />
              </div>

              {/* Retention */}
              <div className="space-y-1.5">
                <Label htmlFor="retentionAmount">Retention Deduction (₹)</Label>
                <Input
                  id="retentionAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={retentionAmountStr}
                  onChange={(e) => setRetentionAmountStr(e.target.value)}
                />
              </div>

              {/* GST Rate */}
              <div className="space-y-1.5">
                <Label htmlFor="gstRate">GST Rate (%)</Label>
                <Input
                  id="gstRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="12"
                  value={gstRateStr}
                  onChange={(e) => setGstRateStr(e.target.value)}
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="rounded-md border bg-muted/40 p-4 mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Bill Preview
              </p>
              <div className="space-y-1.5 text-sm max-w-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Amount</span>
                  <span className="font-mono">₹{fmt(preview.gross)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Less Retention</span>
                  <span className="font-mono">-₹{fmt(preview.retention)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="text-muted-foreground">Sub-total</span>
                  <span className="font-mono">₹{fmt(preview.subTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Add GST ({preview.gstRate}%)</span>
                  <span className="font-mono">+₹{fmt(preview.gstAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-semibold">
                  <span>Net Payable</span>
                  <span className="font-mono text-base">₹{fmt(preview.netPayable)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section: Notes ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes or remarks…"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Action Buttons ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create RA Bill'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/construction/ra-bills">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
