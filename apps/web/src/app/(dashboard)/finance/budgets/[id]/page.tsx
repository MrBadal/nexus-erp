'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Square, RefreshCw } from 'lucide-react';
import { StatusDot } from '@/components/ui/status-dot';
import {
  useBudget,
  useActivateBudget,
  useCloseBudget,
  useRefreshBudgetActuals,
} from '@/hooks/use-budgets';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  active: 'success',
  closed: 'info',
};

export default function BudgetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: budget, isLoading } = useBudget(id);
  const activate = useActivateBudget();
  const close = useCloseBudget();
  const refresh = useRefreshBudgetActuals();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!budget) {
    return <div className="p-6 text-center"><p className="text-muted-foreground">Budget not found</p></div>;
  }

  const totalBudgeted = parseFloat(budget.totalBudgeted);
  const totalActual = parseFloat(budget.totalActual);
  const utilization = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/finance/budgets">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{budget.name}</h1>
              <StatusDot status={statusVariant[budget.status] || 'info'} label={budget.status.charAt(0).toUpperCase() + budget.status.slice(1)} />
            </div>
            <p className="text-sm text-muted-foreground">FY {budget.fiscalYear}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {budget.status === 'draft' && (
            <Button
              onClick={() =>
                activate.mutate(id, {
                  onSuccess: () => toast.success('Budget activated'),
                  onError: (e: Error) => toast.error(e.message || 'Failed to activate'),
                })
              }
              disabled={activate.isPending}
            >
              <Play className="mr-1.5 h-4 w-4" /> Activate
            </Button>
          )}
          {budget.status === 'active' && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  refresh.mutate(id, {
                    onSuccess: () => toast.success('Actuals refreshed'),
                    onError: (e: Error) => toast.error(e.message || 'Failed to refresh'),
                  })
                }
                disabled={refresh.isPending}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh Actuals
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  close.mutate(id, {
                    onSuccess: () => toast.success('Budget closed'),
                    onError: (e: Error) => toast.error(e.message || 'Failed to close'),
                  })
                }
                disabled={close.isPending}
              >
                <Square className="mr-1.5 h-4 w-4" /> Close Budget
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Period</p>
          <p className="text-sm font-medium">{formatDate(budget.fromDate)} - {formatDate(budget.toDate)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Budgeted</p>
          <p className="text-lg font-semibold font-mono">{formatCurrency(totalBudgeted)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Actual</p>
          <p className={`text-lg font-semibold font-mono ${utilization > 100 ? 'text-destructive' : ''}`}>
            {formatCurrency(totalActual)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Utilization</p>
          <p className={`text-lg font-semibold ${utilization > 100 ? 'text-destructive' : utilization > 80 ? 'text-amber-500' : 'text-green-600'}`}>
            {utilization.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Budget Lines</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4">Account</th>
              <th className="pb-2 pr-4 text-right">Budgeted</th>
              <th className="pb-2 pr-4 text-right">Actual</th>
              <th className="pb-2 pr-4 text-right">Variance</th>
              <th className="pb-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {budget.lines?.map((line) => {
              const budgeted = parseFloat(line.budgetedAmount);
              const actual = parseFloat(line.actualAmount);
              const variance = budgeted - actual;
              const pct = budgeted > 0 ? (actual / budgeted) * 100 : 0;
              const isOver = actual > budgeted && budgeted > 0;
              return (
                <tr key={line.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <span className="font-medium">{line.accountCode}</span>
                    <span className="ml-2 text-muted-foreground">{line.accountName}</span>
                  </td>
                  <td className="py-2 pr-4 text-right font-mono">{formatCurrency(budgeted)}</td>
                  <td className="py-2 pr-4 text-right font-mono">{formatCurrency(actual)}</td>
                  <td className={`py-2 pr-4 text-right font-mono ${isOver ? 'text-destructive' : 'text-green-600'}`}>
                    {variance >= 0 ? '' : '-'}{formatCurrency(Math.abs(variance))}
                  </td>
                  <td className={`py-2 text-right font-mono ${isOver ? 'text-destructive font-medium' : ''}`}>
                    {pct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td className="py-2 pr-4">Total</td>
              <td className="py-2 pr-4 text-right font-mono">{formatCurrency(totalBudgeted)}</td>
              <td className="py-2 pr-4 text-right font-mono">{formatCurrency(totalActual)}</td>
              <td className={`py-2 pr-4 text-right font-mono ${totalActual > totalBudgeted ? 'text-destructive' : 'text-green-600'}`}>
                {totalBudgeted - totalActual >= 0 ? '' : '-'}{formatCurrency(Math.abs(totalBudgeted - totalActual))}
              </td>
              <td className="py-2 text-right font-mono">{utilization.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
