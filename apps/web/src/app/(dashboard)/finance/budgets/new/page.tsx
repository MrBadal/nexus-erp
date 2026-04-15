'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useCreateBudget } from '@/hooks/use-budgets';
import { useAccounts } from '@/hooks/use-accounts';

interface BudgetLineItem {
  accountId: string;
  budgetedAmount: string;
  notes: string;
}

export default function NewBudgetPage() {
  const router = useRouter();
  const create = useCreateBudget();
  const { data: accountsData } = useAccounts();
  const accounts = accountsData ?? [];

  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    name: `Budget FY ${currentYear}-${currentYear + 1}`,
    fiscalYear: `${currentYear}-${currentYear + 1}`,
    fromDate: `${currentYear}-04-01`,
    toDate: `${currentYear + 1}-03-31`,
    notes: '',
  });

  const [lines, setLines] = useState<BudgetLineItem[]>([
    { accountId: '', budgetedAmount: '', notes: '' },
  ]);

  const addLine = () => {
    setLines([...lines, { accountId: '', budgetedAmount: '', notes: '' }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof BudgetLineItem, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const total = lines.reduce((sum, l) => sum + (parseFloat(l.budgetedAmount) || 0), 0);

  const expenseAccounts = accounts.filter((a) => a.accountType === 'expense' || a.accountType === 'cost_of_goods_sold');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.accountId && parseFloat(l.budgetedAmount) > 0);
    if (validLines.length === 0) {
      toast.error('Add at least one budget line with an account and amount');
      return;
    }

    try {
      await create.mutateAsync({
        ...form,
        lines: validLines,
      } as Record<string, unknown>);
      toast.success('Budget created');
      router.push('/finance/budgets');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create budget');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/finance/budgets">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Budget</h1>
          <p className="text-sm text-muted-foreground">Set budgeted amounts per account for a fiscal period</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Budget Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Budget Name</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fiscal Year</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.fiscalYear}
                onChange={(e) => setForm({ ...form, fiscalYear: e.target.value })}
                placeholder="2026-2027"
              />
            </div>
            <div>
              <label className="text-sm font-medium">From Date</label>
              <input
                type="date"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.fromDate}
                onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">To Date</label>
              <input
                type="date"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.toDate}
                onChange={(e) => setForm({ ...form, toDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Budget Lines</h2>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Line
            </Button>
          </div>
          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Account</label>}
                  <select
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={line.accountId}
                    onChange={(e) => updateLine(idx, 'accountId', e.target.value)}
                  >
                    <option value="">Select account...</option>
                    {expenseAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Budgeted Amount</label>}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-right"
                    value={line.budgetedAmount}
                    onChange={(e) => updateLine(idx, 'budgetedAmount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-3">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Notes</label>}
                  <input
                    type="text"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={line.notes}
                    onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t pt-3">
            <span className="text-lg font-semibold">Total: ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/finance/budgets"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating...' : 'Create Budget'}
          </Button>
        </div>
      </form>
    </div>
  );
}
