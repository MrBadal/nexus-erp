'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useCreateApprovalWorkflow } from '@/hooks/use-approval-workflows';

interface WorkflowStep {
  stepOrder: number;
  description: string;
}

export default function NewApprovalWorkflowPage() {
  const router = useRouter();
  const create = useCreateApprovalWorkflow();

  const [form, setForm] = useState({
    name: '',
    documentType: 'purchase_order',
    description: '',
    thresholdAmount: '',
  });

  const [steps, setSteps] = useState<WorkflowStep[]>([
    { stepOrder: 1, description: 'Department Manager' },
  ]);

  const addStep = () => {
    setSteps([...steps, { stepOrder: steps.length + 1, description: '' }]);
  };

  const removeStep = (idx: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepOrder: i + 1 })));
    }
  };

  const updateStep = (idx: number, description: string) => {
    const updated = [...steps];
    updated[idx] = { ...updated[idx], description };
    setSteps(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      ...form,
      steps: steps.filter((s) => s.description.trim()),
    });
    router.push('/settings/approval-workflows');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/settings/approval-workflows">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Approval Workflow</h1>
          <p className="text-sm text-muted-foreground">Define a multi-step approval process</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Workflow Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Workflow Name *</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., PO Approval Above 1 Lakh"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Document Type *</label>
              <select
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value })}
              >
                <option value="purchase_order">Purchase Order</option>
                <option value="expense_claim">Expense Claim</option>
                <option value="leave_application">Leave Application</option>
                <option value="journal_entry">Journal Entry</option>
                <option value="sales_order">Sales Order</option>
                <option value="material_request">Material Request</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Threshold Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.thresholdAmount}
                onChange={(e) => setForm({ ...form, thresholdAmount: e.target.value })}
                placeholder="Apply when amount exceeds..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                rows={2}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Approval Steps</h2>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Step
            </Button>
          </div>
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {step.stepOrder}
                </span>
                <input
                  type="text"
                  required
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  value={step.description}
                  onChange={(e) => updateStep(idx, e.target.value)}
                  placeholder={`Step ${step.stepOrder} approver description...`}
                />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStep(idx)} disabled={steps.length === 1}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/settings/approval-workflows"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating...' : 'Create Workflow'}
          </Button>
        </div>
      </form>
    </div>
  );
}
