'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCreateLoan, type LoanType } from '@/hooks/use-loans';
import { useEmployees } from '@/hooks/use-hr';
import { formatCurrency } from '@/lib/utils';

export default function NewLoanPage() {
  const router = useRouter();
  const create = useCreateLoan();
  const { data: employeesData } = useEmployees();
  const employees = employeesData ?? [];

  const [form, setForm] = useState({
    employeeId: '',
    type: 'loan' as LoanType,
    principalAmount: '',
    installments: '1',
    interestRate: '0',
    reason: '',
  });

  const principal = parseFloat(form.principalAmount) || 0;
  const rate = parseFloat(form.interestRate) || 0;
  const installments = parseInt(form.installments, 10) || 1;
  const estimatedEmi = installments > 0 ? (principal * (1 + rate / 100)) / installments : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) {
      toast.error('Employee is required');
      return;
    }
    if (!(principal > 0)) {
      toast.error('Principal amount must be greater than zero');
      return;
    }
    if (!(installments >= 1)) {
      toast.error('Installments must be at least 1');
      return;
    }

    try {
      await create.mutateAsync({
        employeeId: form.employeeId,
        type: form.type,
        principalAmount: principal.toFixed(2),
        interestRate: rate.toFixed(2),
        installments,
        reason: form.reason.trim() || undefined,
      });
      toast.success('Loan created');
      router.push('/hr/loans');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create loan';
      toast.error(msg);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/hr/loans">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Loan / Advance</h1>
          <p className="text-sm text-muted-foreground">Create a loan or salary advance for an employee</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <label className="text-sm font-medium">Type</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as LoanType })}
              >
                <option value="loan">Loan</option>
                <option value="advance">Advance</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Principal Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-right"
                value={form.principalAmount}
                onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Interest Rate (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-right"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Installments</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-right"
                value={form.installments}
                onChange={(e) => setForm({ ...form, installments: e.target.value })}
                placeholder="1"
              />
            </div>
            <div className="flex flex-col justify-end">
              <span className="text-sm text-muted-foreground">Estimated EMI</span>
              <span className="text-lg font-semibold font-mono">{formatCurrency(estimatedEmi)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-2">
          <h2 className="text-lg font-semibold">Reason</h2>
          <textarea
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Purpose of the loan or advance (optional)..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/hr/loans"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating...' : 'Create Loan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
