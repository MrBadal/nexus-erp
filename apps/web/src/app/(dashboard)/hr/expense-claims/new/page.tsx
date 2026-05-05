'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useCreateExpenseClaim } from '@/hooks/use-hr';
import { useEmployees } from '@/hooks/use-hr';
import { formatCurrency } from '@/lib/utils';

interface LineItem {
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
}

const EXPENSE_CATEGORIES = [
  'Travel',
  'Accommodation',
  'Food & Meals',
  'Transportation',
  'Office Supplies',
  'Communication',
  'Training',
  'Client Entertainment',
  'Medical',
  'Other',
];

export default function NewExpenseClaimPage() {
  const router = useRouter();
  const create = useCreateExpenseClaim();
  const { data: employeesData } = useEmployees();
  const employees = employeesData ?? [];

  const [form, setForm] = useState({
    employeeId: '',
    claimDate: new Date().toISOString().split('T')[0],
    purpose: '',
    notes: '',
  });

  const [lines, setLines] = useState<LineItem[]>([
    { expenseDate: new Date().toISOString().split('T')[0], category: 'Travel', description: '', amount: '' },
  ]);

  const addLine = () => {
    setLines([...lines, { expenseDate: new Date().toISOString().split('T')[0], category: 'Travel', description: '', amount: '' }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const total = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) {
      toast.error('Employee is required');
      return;
    }
    if (!form.claimDate) {
      toast.error('Claim date is required');
      return;
    }
    const validLines = lines.filter((l) => l.category && parseFloat(l.amount) > 0);
    if (validLines.length === 0) {
      toast.error('At least one expense line with a positive amount is required');
      return;
    }

    // Build payload — only DTO-accepted fields (employeeId, claimDate, purpose, notes, lines)
    const payload: Record<string, unknown> = {
      employeeId: form.employeeId,
      claimDate: form.claimDate,
      lines: validLines.map((l) => ({
        expenseDate: l.expenseDate,
        category: l.category,
        description: l.description.trim() || undefined,
        amount: parseFloat(l.amount).toFixed(2),
      })),
    };
    if (form.purpose.trim()) payload.purpose = form.purpose.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();

    try {
      await create.mutateAsync(payload);
      toast.success('Expense claim created');
      router.push('/hr/expense-claims');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create expense claim';
      toast.error(msg);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/hr/expense-claims">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Expense Claim</h1>
          <p className="text-sm text-muted-foreground">Submit expenses for reimbursement</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Claim Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Employee</label>
              <select
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              >
                <option value="">Select employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Claim Date</label>
              <input
                type="date"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.claimDate}
                onChange={(e) => setForm({ ...form, claimDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Purpose</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g., Client visit, Training"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Expense Lines</h2>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Line
            </Button>
          </div>
          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-2">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Date</label>}
                  <input
                    type="date"
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={line.expenseDate}
                    onChange={(e) => updateLine(idx, 'expenseDate', e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Category</label>}
                  <select
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={line.category}
                    onChange={(e) => updateLine(idx, 'category', e.target.value)}
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Description</label>}
                  <input
                    type="text"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={line.description}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    placeholder="Description..."
                  />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Amount</label>}
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-right"
                    value={line.amount}
                    onChange={(e) => updateLine(idx, 'amount', e.target.value)}
                    placeholder="0.00"
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
            <span className="text-lg font-semibold">Total: {formatCurrency(total, 'INR', 'en-IN')}</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-2">
          <h2 className="text-lg font-semibold">Notes</h2>
          <textarea
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional context or remarks (optional)..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/hr/expense-claims"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating...' : 'Create Expense Claim'}
          </Button>
        </div>
      </form>
    </div>
  );
}
