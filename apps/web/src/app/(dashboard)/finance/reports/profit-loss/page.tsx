'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ReportFilters } from '@/components/finance/report-filters';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp } from 'lucide-react';
import {
  useProfitLoss,
  downloadReportPdf,
  type ProfitLossResult,
} from '@/hooks/use-reports';
import { apiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface ReportLine {
  label: string;
  amount?: number;
  indent?: number;
  isHeader?: boolean;
  isSectionTotal?: boolean;
  isGrandTotal?: boolean;
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function formatAmount(amount: number): string {
  if (amount < 0) {
    return `(${formatCurrency(Math.abs(amount))})`;
  }
  return formatCurrency(amount);
}

function buildLines(data: ProfitLossResult): ReportLine[] {
  const lines: ReportLine[] = [];

  lines.push({ label: 'REVENUE', isHeader: true });
  for (const r of data.revenue) {
    lines.push({
      label: `${r.accountCode} - ${r.accountName}`,
      amount: parseFloat(r.amount),
      indent: 1,
    });
  }
  lines.push({
    label: 'Total Revenue',
    amount: parseFloat(data.totalRevenue),
    isSectionTotal: true,
  });
  lines.push({ label: '' });

  lines.push({ label: 'EXPENSES', isHeader: true });
  for (const e of data.expenses) {
    lines.push({
      label: `${e.accountCode} - ${e.accountName}`,
      amount: parseFloat(e.amount),
      indent: 1,
    });
  }
  lines.push({
    label: 'Total Expenses',
    amount: parseFloat(data.totalExpenses),
    isSectionTotal: true,
  });
  lines.push({ label: '' });

  lines.push({
    label: 'NET PROFIT / (LOSS)',
    amount: parseFloat(data.netIncome),
    isGrandTotal: true,
  });

  return lines;
}

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState<string>(firstOfMonth());
  const [dateTo, setDateTo] = useState<string>(today());

  const { data, isLoading, isError, error, refetch, isFetching } =
    useProfitLoss(dateFrom, dateTo);

  const lines = useMemo(() => (data ? buildLines(data) : []), [data]);

  const isEmpty = !!data && data.revenue.length === 0 && data.expenses.length === 0;

  const handleExportCsv = useCallback(() => {
    if (!lines.length) return;
    const headers = ['', 'Amount'];
    const csvRows = lines
      .filter((line) => line.label !== '')
      .map((line) => {
        const indent = '  '.repeat(line.indent ?? 0);
        const amt =
          line.amount !== undefined && !line.isHeader ? line.amount.toFixed(2) : '';
        return [`"${indent}${line.label}"`, amt].join(',');
      });

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lines, dateFrom, dateTo]);

  const handleExportPdf = useCallback(() => {
    void downloadReportPdf(
      'profit-loss',
      { fromDate: dateFrom, toDate: dateTo },
      `Profit-Loss-${dateTo}.pdf`,
    );
  }, [dateFrom, dateTo]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Profit & Loss Statement"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Reports' },
          { label: 'Profit & Loss' },
        ]}
      />

      <ReportFilters
        showDateRange
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onGenerate={() => refetch()}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        isLoading={isLoading || isFetching}
      />

      <div className="flex-1 overflow-auto p-6">
        {isError && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{apiErrorMessage(error, 'Failed to load profit & loss statement')}</span>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="text-sm font-semibold">Profit & Loss Statement</h3>
              <p className="text-xs text-muted-foreground">
                Period: {dateFrom} to {dateTo}
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : !isError && isEmpty ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">No data for this period</p>
                <p className="text-xs text-muted-foreground">
                  Post revenue or expense journal entries to see results here.
                </p>
              </div>
            ) : !isError && data ? (
              <div className="px-4 py-2">
                {lines.map((line, idx) => {
                  if (line.label === '') {
                    return <div key={idx} className="h-2" />;
                  }

                  if (line.isHeader) {
                    return (
                      <div
                        key={idx}
                        className="flex items-center h-9 px-3 bg-muted/50 rounded-sm mt-1 mb-0.5"
                      >
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {line.label}
                        </span>
                      </div>
                    );
                  }

                  if (line.isGrandTotal) {
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between h-10 px-3 border-t-2 border-b-2 border-foreground/30 mt-1"
                      >
                        <span className="text-sm font-bold">{line.label}</span>
                        <span
                          className={`erp-number text-base font-bold ${
                            (line.amount ?? 0) < 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {formatAmount(line.amount ?? 0)}
                        </span>
                      </div>
                    );
                  }

                  if (line.isSectionTotal) {
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between h-8 px-3 border-t border-foreground/15"
                      >
                        <span className="text-sm font-semibold">{line.label}</span>
                        <span
                          className={`erp-number font-semibold ${
                            (line.amount ?? 0) < 0 ? 'text-red-600' : ''
                          }`}
                        >
                          {formatAmount(line.amount ?? 0)}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="flex items-center justify-between h-7 px-3">
                      <span
                        className="text-sm"
                        style={{ paddingLeft: (line.indent ?? 0) * 20 }}
                      >
                        {line.label}
                      </span>
                      <span
                        className={`erp-number ${
                          (line.amount ?? 0) < 0 ? 'text-red-600' : ''
                        }`}
                      >
                        {formatAmount(line.amount ?? 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
