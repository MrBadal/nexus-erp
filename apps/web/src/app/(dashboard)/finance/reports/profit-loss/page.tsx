'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ReportFilters } from '@/components/finance/report-filters';
import { Card, CardContent } from '@/components/ui/card';

interface ReportLine {
  label: string;
  amount: number;
  indent?: number;
  isHeader?: boolean;
  isSectionTotal?: boolean;
  isGrandTotal?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function formatAmount(amount: number): string {
  if (amount < 0) {
    return `(${currencyFormatter.format(Math.abs(amount))})`;
  }
  return currencyFormatter.format(amount);
}

function buildProfitLossData(): ReportLine[] {
  const incomeItems = [
    { label: 'Sales Revenue', amount: 284500 },
    { label: 'Service Revenue', amount: 45000 },
    { label: 'Other Income', amount: 2800 },
  ];
  const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);

  const cogsItems = [
    { label: 'Material Costs', amount: 112000 },
    { label: 'Labor Costs', amount: 35000 },
    { label: 'Manufacturing Overhead', amount: 9200 },
  ];
  const totalCogs = cogsItems.reduce((s, i) => s + i.amount, 0);

  const grossProfit = totalIncome - totalCogs;

  const opexItems = [
    { label: 'Rent Expense', amount: 42000 },
    { label: 'Utilities', amount: 8400 },
    { label: 'Salaries & Wages', amount: 28500 },
    { label: 'Marketing', amount: 6200 },
    { label: 'Office Supplies', amount: 3400 },
    { label: 'Insurance', amount: 6300 },
  ];
  const totalOpex = opexItems.reduce((s, i) => s + i.amount, 0);

  const netProfit = grossProfit - totalOpex;

  return [
    { label: 'INCOME', amount: 0, isHeader: true },
    ...incomeItems.map((i) => ({ label: i.label, amount: i.amount, indent: 1 })),
    { label: 'Total Income', amount: totalIncome, isSectionTotal: true },
    { label: '', amount: 0 },
    { label: 'COST OF GOODS SOLD', amount: 0, isHeader: true },
    ...cogsItems.map((i) => ({ label: i.label, amount: i.amount, indent: 1 })),
    { label: 'Total COGS', amount: totalCogs, isSectionTotal: true },
    { label: '', amount: 0 },
    { label: 'GROSS PROFIT', amount: grossProfit, isSectionTotal: true },
    { label: '', amount: 0 },
    { label: 'OPERATING EXPENSES', amount: 0, isHeader: true },
    ...opexItems.map((i) => ({ label: i.label, amount: i.amount, indent: 1 })),
    { label: 'Total Operating Expenses', amount: totalOpex, isSectionTotal: true },
    { label: '', amount: 0 },
    { label: 'NET PROFIT', amount: netProfit, isGrandTotal: true },
  ];
}

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState<string>('2026-03-01');
  const [dateTo, setDateTo] = useState<string>('2026-03-31');
  const [generated, setGenerated] = useState(true);

  const reportLines = useMemo(() => buildProfitLossData(), []);

  const handleExportCsv = useCallback(() => {
    const headers = ['', 'Amount'];
    const csvRows = reportLines
      .filter((line) => line.label !== '')
      .map((line) => {
        const prefix = line.indent ? '  ' : '';
        return [`"${prefix}${line.label}"`, line.isHeader ? '' : line.amount.toFixed(2)].join(',');
      });

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [reportLines, dateFrom, dateTo]);

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
        onGenerate={() => setGenerated(true)}
        onExportCsv={handleExportCsv}
      />

      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="text-sm font-semibold">Profit & Loss Statement</h3>
              <p className="text-xs text-muted-foreground">
                Period: {dateFrom} to {dateTo}
              </p>
            </div>

            <div className="px-4 py-2">
              {reportLines.map((line, idx) => {
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
                          line.amount < 0 ? 'text-red-600' : ''
                        }`}
                      >
                        {formatAmount(line.amount)}
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
                          line.amount < 0 ? 'text-red-600' : ''
                        }`}
                      >
                        {formatAmount(line.amount)}
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
                    <span className={`erp-number ${line.amount < 0 ? 'text-red-600' : ''}`}>
                      {formatAmount(line.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
