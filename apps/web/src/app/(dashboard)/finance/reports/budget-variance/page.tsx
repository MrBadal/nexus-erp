'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';
import { useBudgetVariance } from '@/hooks/use-reports';
import { formatCurrency } from '@/lib/utils';

function flagColor(flag: string): string {
  switch (flag) {
    case 'under':
      return 'text-green-600 bg-green-50';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50';
    case 'over':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-muted-foreground bg-muted';
  }
}

export default function BudgetVariancePage() {
  const [budgetId, setBudgetId] = useState<string>('');
  const [submittedId, setSubmittedId] = useState<string>('');

  const { data, isLoading } = useBudgetVariance(submittedId, !!submittedId);

  const lines = data?.lines ?? [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Budget Variance"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Reports', href: '/finance/reports' },
          { label: 'Budget Variance' },
        ]}
      />

      <div className="no-print flex flex-row items-end gap-3 px-6 py-3 border-b bg-muted/30 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Budget ID</label>
          <Input
            value={budgetId}
            onChange={(e) => setBudgetId(e.target.value)}
            placeholder="Enter budget ID"
            className="h-8 w-[280px] text-sm"
          />
        </div>
        <Button
          size="sm"
          className="h-8"
          onClick={() => setSubmittedId(budgetId)}
          disabled={!budgetId || isLoading}
        >
          <Play className="mr-1.5 h-3.5 w-3.5" />
          Generate
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !submittedId ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Enter a budget ID and click &quot;Generate&quot; to load the report
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold">{data?.budgetName ?? 'Budget Variance'}</h3>
                <p className="text-xs text-muted-foreground">
                  {data?.periodStart && data?.periodEnd
                    ? `Period: ${data.periodStart} to ${data.periodEnd}`
                    : 'All periods'}
                  {' '}| {lines.length} line items
                </p>
              </div>

              <table className="erp-table w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Account Code</th>
                    <th className="text-left">Account Name</th>
                    <th className="text-right">Budgeted</th>
                    <th className="text-right">Actual</th>
                    <th className="text-right">Variance</th>
                    <th className="text-right">Variance %</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No data found.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line) => (
                      <tr key={line.accountId}>
                        <td className="text-left font-mono text-xs">{line.accountCode}</td>
                        <td className="text-left">{line.accountName}</td>
                        <td className="erp-number">{formatCurrency(line.budgetedAmount)}</td>
                        <td className="erp-number">{formatCurrency(line.actualAmount)}</td>
                        <td className="erp-number">{formatCurrency(line.variance)}</td>
                        <td className="erp-number">{line.variancePercent.toFixed(1)}%</td>
                        <td className="text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${flagColor(line.flag)}`}>
                            {line.flag}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
