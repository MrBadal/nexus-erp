'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ReportFilters } from '@/components/finance/report-filters';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';

const demoTrialBalance = [
  { code: '1000', name: 'Cash', debit: 67650, credit: 0 },
  { code: '1100', name: 'Bank Account', debit: 125000, credit: 0 },
  { code: '1200', name: 'Accounts Receivable', debit: 89300, credit: 0 },
  { code: '1300', name: 'Inventory', debit: 45000, credit: 0 },
  { code: '2000', name: 'Accounts Payable', debit: 0, credit: 45600 },
  { code: '2100', name: 'Accrued Expenses', debit: 0, credit: 12500 },
  { code: '3000', name: "Owner's Equity", debit: 0, credit: 150000 },
  { code: '3100', name: 'Retained Earnings', debit: 0, credit: 85350 },
  { code: '4000', name: 'Sales Revenue', debit: 0, credit: 284500 },
  { code: '5000', name: 'Cost of Goods Sold', debit: 156200, credit: 0 },
  { code: '6000', name: 'Operating Expenses', debit: 94800, credit: 0 },
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

export default function TrialBalancePage() {
  const [dateFrom, setDateFrom] = useState<string>('2026-03-01');
  const [dateTo, setDateTo] = useState<string>('2026-03-31');
  const [generated, setGenerated] = useState(true);

  const { totalDebit, totalCredit, isBalanced } = useMemo(() => {
    const td = demoTrialBalance.reduce((sum, row) => sum + row.debit, 0);
    const tc = demoTrialBalance.reduce((sum, row) => sum + row.credit, 0);
    return { totalDebit: td, totalCredit: tc, isBalanced: td === tc };
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = ['Account Code', 'Account Name', 'Debit', 'Credit'];
    const csvRows = demoTrialBalance.map((row) =>
      [row.code, `"${row.name}"`, row.debit.toFixed(2), row.credit.toFixed(2)].join(',')
    );
    csvRows.push(['', 'TOTALS', totalDebit.toFixed(2), totalCredit.toFixed(2)].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dateFrom, dateTo, totalDebit, totalCredit]);

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
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Trial Balance</h3>
                <p className="text-xs text-muted-foreground">
                  Period: {dateFrom} to {dateTo}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {isBalanced ? (
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
            </div>

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
                {demoTrialBalance.map((row) => (
                  <tr key={row.code}>
                    <td className="text-left font-mono text-xs">{row.code}</td>
                    <td className="text-left">{row.name}</td>
                    <td className="erp-number">{formatCurrency(row.debit)}</td>
                    <td className="erp-number">{formatCurrency(row.credit)}</td>
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
                      isBalanced ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {currencyFormatter.format(totalDebit)}
                  </td>
                  <td
                    className={`erp-number font-bold ${
                      isBalanced ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {currencyFormatter.format(totalCredit)}
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
