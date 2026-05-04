'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSubmitEssExpense } from '@/hooks/use-ess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LineDraft {
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
}

const CATEGORY_OPTIONS = [
  'Travel',
  'Meals',
  'Accommodation',
  'Office Supplies',
  'Communication',
  'Other',
];

export default function EssNewExpensePage() {
  const router = useRouter();
  const submit = useSubmitEssExpense();

  const today = new Date().toISOString().slice(0, 10);
  const [claimDate, setClaimDate] = React.useState(today);
  const [purpose, setPurpose] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [lines, setLines] = React.useState<LineDraft[]>([
    { expenseDate: today, category: '', description: '', amount: '' },
  ]);

  const total = lines.reduce(
    (sum, l) => sum + (parseFloat(l.amount) || 0),
    0,
  );

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    );
  };

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { expenseDate: today, category: '', description: '', amount: '' },
    ]);

  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    for (const l of lines) {
      if (!l.expenseDate || !l.category || !l.amount) {
        toast.error('Each line needs date, category and amount');
        return;
      }
      if (parseFloat(l.amount) <= 0) {
        toast.error('Amount must be greater than zero');
        return;
      }
    }
    try {
      await submit.mutateAsync({
        claimDate,
        purpose: purpose || undefined,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          expenseDate: l.expenseDate,
          category: l.category,
          description: l.description || undefined,
          amount: l.amount,
        })),
      });
      toast.success('Expense claim submitted');
      router.push('/ess/expenses');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        e.response?.data?.message ?? e.message ?? 'Failed to submit claim',
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/ess/expenses"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to expenses
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Expense Claim</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="claimDate">Claim Date</Label>
                <Input
                  id="claimDate"
                  type="date"
                  value={claimDate}
                  onChange={(e) => setClaimDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Client visit to Mumbai"
                />
              </div>
            </div>

            {/* Lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add line
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((l, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 rounded-md border bg-muted/30 p-2"
                  >
                    <Input
                      className="col-span-3"
                      type="date"
                      value={l.expenseDate}
                      onChange={(e) =>
                        updateLine(idx, { expenseDate: e.target.value })
                      }
                    />
                    <select
                      className="col-span-3 h-10 rounded-md border bg-background px-2 text-sm"
                      value={l.category}
                      onChange={(e) =>
                        updateLine(idx, { category: e.target.value })
                      }
                    >
                      <option value="">Category</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <Input
                      className="col-span-3"
                      placeholder="Description"
                      value={l.description}
                      onChange={(e) =>
                        updateLine(idx, { description: e.target.value })
                      }
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      value={l.amount}
                      onChange={(e) =>
                        updateLine(idx, { amount: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-1"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pr-12 text-sm">
                <span className="text-muted-foreground">Total:&nbsp;</span>
                <strong>₹ {total.toFixed(2)}</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional context for the approver"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/ess/expenses">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? 'Submitting…' : 'Submit claim'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
