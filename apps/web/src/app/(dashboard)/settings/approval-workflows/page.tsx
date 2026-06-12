'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { useApprovalWorkflows, useDeleteApprovalWorkflow, useUpdateApprovalWorkflow, type ApprovalWorkflow } from '@/hooks/use-approval-workflows';
import { formatDate } from '@/lib/utils';

const docTypeLabels: Record<string, string> = {
  purchase_order: 'Purchase Order',
  expense_claim: 'Expense Claim',
  leave_application: 'Leave Application',
  journal_entry: 'Journal Entry',
  sales_order: 'Sales Order',
  material_request: 'Material Request',
};

export default function ApprovalWorkflowsPage() {
  const { data, isLoading } = useApprovalWorkflows();
  const workflows = (data as ApprovalWorkflow[] | undefined) ?? [];
  const deleteWf = useDeleteApprovalWorkflow();
  const updateWf = useUpdateApprovalWorkflow();

  const handleToggle = async (wf: ApprovalWorkflow) => {
    await updateWf.mutateAsync({ id: wf.id, isActive: !wf.isActive });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this approval workflow?')) {
      await deleteWf.mutateAsync(id);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Configure multi-step approval processes for different document types
          </p>
        </div>
        <Link href="/settings/approval-workflows/new">
          <Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> New Workflow</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No approval workflows configured.</p>
          <Link href="/settings/approval-workflows/new">
            <Button size="sm" className="mt-3"><Plus className="mr-1 h-3.5 w-3.5" /> Create Workflow</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <div key={wf.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{wf.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {docTypeLabels[wf.documentType] || wf.documentType}
                    {wf.thresholdAmount && ` · Threshold: ₹${parseFloat(wf.thresholdAmount).toLocaleString('en-IN')}`}
                  </p>
                  {wf.description && <p className="text-xs text-muted-foreground mt-1">{wf.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={wf.isActive}
                      onChange={() => handleToggle(wf)}
                    />
                    Active
                  </label>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(wf.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Created {formatDate(wf.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
