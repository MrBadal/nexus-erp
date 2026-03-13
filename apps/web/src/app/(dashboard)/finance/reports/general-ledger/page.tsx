'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ReportFilters } from '@/components/finance/report-filters';
import { Card, CardContent } from '@/components/ui/card';

const demoAccounts = [
  { label: '1000 - Cash', value: '1000' },
  { label: '1100 - Bank Account', value: '1100' },
  { label: '1200 - Accounts Receivable', value: '1200' },
  { label: '2000 - Accounts Payable', value: '2000' },
  { label: '4000 - Sales Revenue', value: '4000' },
  { label: '6000 - Operating Expenses', value: '6000' },
];

const demoLedgerData = [
  { date: '2026-03-01', entryNumber: 'JE-2026-000001', description: 'Opening Balance', debit: 50000, credit: 0 },
  { date: '2026-03-03', entryNumber: 'JE-2026-000002', description: 'Office Rent Payment', debit: 0, credit: 3500 },
  { date: '2026-03-05', entryNumber: 'JE-2026-000003', description: 'Client Payment Received', debit: 12500, credit: 0 },
  { date: '2026-03-08', entryNumber: 'JE-2026-000004', description: 'Utility Bills', debit: 0, credit: 850 },
  { date: '2026-03-10', entryNumber: 'JE-2026-000005', description: 'Sales Revenue', debit: 28000, credit: 0 },
  { date: '2026-03-12', entryNumber: 'JE-2026-000006', description: 'Payroll', debit: 0, credit: 18500 },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function formatCurrency(amount: number): string {
  if (amount === 0) return '-';
  return currencyFormatter.format(amount);
}

export default function GeneralLedgerPage() {
  const [account, setAccount] = useState<string>('1000');
  const [dateFrom, setDateFrom] = useState<string>('2026-03-01');
  const [dateTo, setDateTo] = useState<string>('2026-03-31');
  const [generated, setGenerated] = useState(true);

  const computedData = useMemo(() => {
    if (!generated) return { rows: [], totalDebit: 0, totalCredit: 0, endingBalance: 0 };

    let runningBalance = 0;
    const rows = demoLedgerData.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return { ...entry, balance: runningBalance };
    });

    const totalDebit = demoLedgerData.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = demoLedgerData.reduce((sum, e) => sum + e.credit, 0);

    return { rows, totalDebit, totalCredit, endingBalance: runningBalance };
  }, [generated]);

  const handleExportCsv = useCallback(() => {
    const headers = ['Date', 'Entry #', 'Description', 'Debit', 'Credit', 'Balance'];
    let runningBalance = 0;
    const csvRows = demoLedgerData.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return [
        entry.date,
        entry.entryNumber,
        entry.description,
        entry.debit.toFixed(2),
        entry.credit.toFixed(2),
        runningBalance.toFixed(2),
      ].join(',');
    });

    const totalDebit = demoLedgerData.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = demoLedgerData.reduce((sum, e) => sum + e.credit, 0);
    csvRows.push(['', '', 'TOTALS', totalDebit.toFixed(2), totalCredit.toFixed(2), runningBalance.toFixed(2)].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${account}-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [account, dateFrom, dateTo]);

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
        accounts={demoAccounts}
        showDateRange
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onGenerate={() => setGenerated(true)}
        onExportCsv={handleExportCsv}
      />

      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="text-sm font-semibold">
                Account: {demoAccounts.find((a) => a.value === account)?.label ?? account}
              </h3>
              <p className="text-xs text-muted-foreground">
                Period: {dateFrom} to {dateTo}
              </p>
            </div>

            <table className="erp-table w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left">Date</th>
                  <th className="text-left">Entry #</th>
                  <th className="text-left">Description</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {computedData.rows.map((row) => (
                  <tr key={row.entryNumber}>
                    <td className="text-left">{row.date}</td>
                    <td className="text-left font-mono text-xs">{row.entryNumber}</td>
                    <td className="text-left">{row.description}</td>
                    <td className="erp-number">{formatCurrency(row.debit)}</td>
                    <td className="erp-number">{formatCurrency(row.credit)}</td>
                    <td className="erp-number font-semibold">{currencyFormatter.format(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-foreground/20 font-semibold">
                  <td colSpan={3} className="text-right font-semibold">
                    Totals
                  </td>
                  <td className="erp-number font-semibold">
                    {currencyFormatter.format(computedData.totalDebit)}
                  </td>
                  <td className="erp-number font-semibold">
                    {currencyFormatter.format(computedData.totalCredit)}
                  </td>
                  <td className="erp-number font-bold">
                    {currencyFormatter.format(computedData.endingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
