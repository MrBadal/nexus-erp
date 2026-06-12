'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ReportFilters } from '@/components/finance/report-filters';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, Scale, XCircle } from 'lucide-react';
import {
  useBalanceSheet,
  downloadReportPdf,
  type BalanceSheetResult,
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

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function formatAmount(amount: number): string {
  if (amount < 0) {
    return `(${formatCurrency(Math.abs(amount))})`;
  }
  return formatCurrency(amount);
}

function buildLines(data: BalanceSheetResult): ReportLine[] {
  const lines: ReportLine[] = [];

  lines.push({ label: 'ASSETS', isHeader: true });
  for (const a of data.assets) {
    lines.push({
      label: `${a.accountCode} - ${a.accountName}`,
      amount: parseFloat(a.balance),
      indent: 1,
    });
  }
  lines.push({
    label: 'TOTAL ASSETS',
    amount: parseFloat(data.totalAssets),
    isGrandTotal: true,
  });
  lines.push({ label: '' });

  lines.push({ label: 'LIABILITIES', isHeader: true });
  for (const l of data.liabilities) {
    lines.push({
      label: `${l.accountCode} - ${l.accountName}`,
      amount: parseFloat(l.balance),
      indent: 1,
    });
  }
  lines.push({
    label: 'TOTAL LIABILITIES',
    amount: parseFloat(data.totalLiabilities),
    isGrandTotal: true,
  });
  lines.push({ label: '' });

  lines.push({ label: 'EQUITY', isHeader: true });
  for (const e of data.equity) {
    lines.push({
      label: `${e.accountCode} - ${e.accountName}`,
      amount: parseFloat(e.balance),
      indent: 1,
    });
  }
  lines.push({
    label: 'Retained Earnings (current period)',
    amount: parseFloat(data.retainedEarnings),
    indent: 1,
  });
  lines.push({
    label: 'TOTAL EQUITY',
    amount: parseFloat(data.totalEquity),
    isGrandTotal: true,
  });
  lines.push({ label: '' });

  lines.push({
    label: 'TOTAL LIABILITIES & EQUITY',
    amount: parseFloat(data.totalLiabilities) + parseFloat(data.totalEquity),
    isGrandTotal: true,
  });

  return lines;
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState<string>(today());

  const { data, isLoading, isError, error, refetch, isFetching } =
    useBalanceSheet(asOfDate);

  const lines = useMemo(() => (data ? buildLines(data) : []), [data]);

  const isEmpty =
    !!data &&
    data.assets.length === 0 &&
    data.liabilities.length === 0 &&
    data.equity.length === 0;

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
    a.download = `balance-sheet-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lines, asOfDate]);

  const handleExportPdf = useCallback(() => {
    void downloadReportPdf(
      'balance-sheet',
      { asOfDate },
      `Balance-Sheet-${asOfDate}.pdf`,
    );
  }, [asOfDate]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Balance Sheet"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Reports' },
          { label: 'Balance Sheet' },
        ]}
      />

      <ReportFilters
        showAsOfDate
        asOfDate={asOfDate}
        onAsOfDateChange={setAsOfDate}
        onGenerate={() => refetch()}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        isLoading={isLoading || isFetching}
      />

      <div className="flex-1 overflow-auto p-6">
        {isError && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{apiErrorMessage(error, 'Failed to load balance sheet')}</span>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Balance Sheet</h3>
                <p className="text-xs text-muted-foreground">
                  As of {data?.asOfDate ?? asOfDate}
                </p>
              </div>
              {data && !isEmpty && (
                <div className="flex items-center gap-1.5">
                  {data.isBalanced ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-semibold text-green-600">Balanced</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-xs font-semibold text-red-600">Unbalanced</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : !isError && isEmpty ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Scale className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">No data for this date</p>
                <p className="text-xs text-muted-foreground">
                  Post journal entries to see the balance sheet here.
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
                            (line.amount ?? 0) < 0 ? 'text-red-600' : ''
                          }`}
                        >
                          {formatAmount(line.amount ?? 0)}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between h-7 px-3"
                      style={{ paddingLeft: (line.indent ?? 0) * 20 }}
                    >
                      <span className="text-sm">{line.label}</span>
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
