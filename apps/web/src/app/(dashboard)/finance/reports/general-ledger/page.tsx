'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ReportFilters } from '@/components/finance/report-filters';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BookOpen } from 'lucide-react';
import { useGeneralLedger } from '@/hooks/use-reports';
import { useAccounts } from '@/hooks/use-accounts';
import { apiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const ALL_ACCOUNTS = 'all';

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtAmount(value: string): string {
  const n = parseFloat(value);
  if (!n) return '-';
  return formatCurrency(n);
}

export default function GeneralLedgerPage() {
  const [account, setAccount] = useState<string>(ALL_ACCOUNTS);
  const [dateFrom, setDateFrom] = useState<string>(firstOfMonth());
  const [dateTo, setDateTo] = useState<string>(today());

  const { data: accounts } = useAccounts();

  const accountOptions = useMemo(() => {
    const options = [{ label: 'All accounts', value: ALL_ACCOUNTS }];
    for (const acct of accounts ?? []) {
      if (acct.isHeader) continue;
      options.push({ label: `${acct.code} - ${acct.name}`, value: acct.id });
    }
    return options;
  }, [accounts]);

  const accountId = account === ALL_ACCOUNTS ? undefined : account;

  const { data, isLoading, isError, error, refetch, isFetching } =
    useGeneralLedger({ accountId, fromDate: dateFrom, toDate: dateTo });

  const lines = data?.lines ?? [];

  const { totalDebit, totalCredit } = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      debit += parseFloat(line.debitAmount);
      credit += parseFloat(line.creditAmount);
    }
    return { totalDebit: debit, totalCredit: credit };
  }, [lines]);

  const selectedAccountLabel =
    accountOptions.find((o) => o.value === account)?.label ?? 'All accounts';

  const handleExportCsv = useCallback(() => {
    if (!lines.length) return;
    const headers = ['Date', 'Entry #', 'Account', 'Description', 'Debit', 'Credit', 'Balance'];
    const csvRows = lines.map((line) =>
      [
        line.date,
        line.entryNumber,
        `"${line.accountCode} - ${line.accountName}"`,
        `"${line.description ?? ''}"`,
        parseFloat(line.debitAmount).toFixed(2),
        parseFloat(line.creditAmount).toFixed(2),
        parseFloat(line.runningBalance).toFixed(2),
      ].join(','),
    );
    csvRows.push(
      ['', '', '', 'TOTALS', totalDebit.toFixed(2), totalCredit.toFixed(2), ''].join(','),
    );

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lines, dateFrom, dateTo, totalDebit, totalCredit]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="General Ledger"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Reports' },
          { label: 'General Ledger' },
        ]}
      />

      <ReportFilters
        showAccountFilter
        account={account}
        onAccountChange={setAccount}
        accounts={accountOptions}
        showDateRange
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onGenerate={() => refetch()}
        onExportCsv={handleExportCsv}
        isLoading={isLoading || isFetching}
      />

      <div className="flex-1 overflow-auto p-6">
        {isError && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{apiErrorMessage(error, 'Failed to load general ledger')}</span>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="text-sm font-semibold">Account: {selectedAccountLabel}</h3>
              <p className="text-xs text-muted-foreground">
                Period: {dateFrom} to {dateTo}
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : !isError && lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">No ledger entries found</p>
                <p className="text-xs text-muted-foreground">
                  No posted journal lines match the selected account and date range.
                </p>
              </div>
            ) : !isError ? (
              <table className="erp-table w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Date</th>
                    <th className="text-left">Entry #</th>
                    <th className="text-left">Account</th>
                    <th className="text-left">Description</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.lineId}>
                      <td className="text-left">{formatDate(line.date)}</td>
                      <td className="text-left font-mono text-xs">{line.entryNumber}</td>
                      <td className="text-left text-xs">
                        {line.accountCode} - {line.accountName}
                      </td>
                      <td className="text-left">{line.description ?? '-'}</td>
                      <td className="erp-number">{fmtAmount(line.debitAmount)}</td>
                      <td className="erp-number">{fmtAmount(line.creditAmount)}</td>
                      <td className="erp-number font-semibold">
                        {formatCurrency(parseFloat(line.runningBalance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-foreground/20 font-semibold">
                    <td colSpan={4} className="text-right font-semibold">
                      Totals
                    </td>
                    <td className="erp-number font-semibold">{formatCurrency(totalDebit)}</td>
                    <td className="erp-number font-semibold">{formatCurrency(totalCredit)}</td>
                    <td className="erp-number font-bold">
                      {lines.length > 0
                        ? formatCurrency(
                            parseFloat(lines[lines.length - 1].runningBalance),
                          )
                        : '-'}
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
