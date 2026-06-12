'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ReportFilters } from '@/components/finance/report-filters';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, FileBarChart, XCircle } from 'lucide-react';
import { useTrialBalance, downloadReportPdf } from '@/hooks/use-reports';
import { apiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtAmount(value: string): string {
  const n = parseFloat(value);
  if (!n) return '-';
  return formatCurrency(n);
}

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState<string>(today());

  const { data, isLoading, isError, error, refetch, isFetching } =
    useTrialBalance(asOfDate);

  const rows = data?.rows ?? [];

  const handleExportCsv = useCallback(() => {
    if (!data) return;
    const headers = ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit'];
    const csvRows = data.rows.map((row) =>
      [
        row.accountCode,
        `"${row.accountName}"`,
        row.accountType,
        parseFloat(row.debitBalance).toFixed(2),
        parseFloat(row.creditBalance).toFixed(2),
      ].join(','),
    );
    csvRows.push(
      [
        '',
        'TOTALS',
        '',
        parseFloat(data.totalDebits).toFixed(2),
        parseFloat(data.totalCredits).toFixed(2),
      ].join(','),
    );

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, asOfDate]);

  const handleExportPdf = useCallback(() => {
    void downloadReportPdf(
      'trial-balance',
      { asOfDate },
      `Trial-Balance-${asOfDate}.pdf`,
    );
  }, [asOfDate]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Trial Balance"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Reports' },
          { label: 'Trial Balance' },
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
            <span>{apiErrorMessage(error, 'Failed to load trial balance')}</span>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Trial Balance</h3>
                <p className="text-xs text-muted-foreground">
                  As of {data?.asOfDate ?? asOfDate}
                </p>
              </div>
              {data && rows.length > 0 && (
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
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : !isError && rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <FileBarChart className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">No data for this period</p>
                <p className="text-xs text-muted-foreground">
                  Post journal entries to see account balances here.
                </p>
              </div>
            ) : !isError ? (
              <table className="erp-table w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Account Code</th>
                    <th className="text-left">Account Name</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.accountId}>
                      <td className="text-left font-mono text-xs">{row.accountCode}</td>
                      <td className="text-left">{row.accountName}</td>
                      <td className="erp-number">{fmtAmount(row.debitBalance)}</td>
                      <td className="erp-number">{fmtAmount(row.creditBalance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-foreground/20 font-semibold">
                    <td colSpan={2} className="text-right font-semibold">
                      Totals
                    </td>
                    <td
                      className={`erp-number font-bold ${
                        data?.isBalanced ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(parseFloat(data?.totalDebits ?? '0'))}
                    </td>
                    <td
                      className={`erp-number font-bold ${
                        data?.isBalanced ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(parseFloat(data?.totalCredits ?? '0'))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
