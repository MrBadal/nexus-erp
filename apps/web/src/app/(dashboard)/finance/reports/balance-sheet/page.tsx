'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ReportFilters } from '@/components/finance/report-filters';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ReportLine {
  label: string;
  amount?: number;
  indent?: number;
  isHeader?: boolean;
  isSubHeader?: boolean;
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

function buildBalanceSheetData(): { lines: ReportLine[]; isBalanced: boolean } {
  const currentAssets = [
    { label: 'Cash', amount: 67650 },
    { label: 'Bank Account', amount: 125000 },
    { label: 'Accounts Receivable', amount: 89300 },
    { label: 'Inventory', amount: 45000 },
    { label: 'Prepaid Expenses', amount: 3200 },
  ];
  const totalCurrentAssets = currentAssets.reduce((s, i) => s + i.amount, 0);

  const fixedAssets = [
    { label: 'Equipment', amount: 35000 },
    { label: 'Furniture & Fixtures', amount: 12000 },
    { label: 'Vehicles', amount: 28000 },
    { label: 'Less: Accumulated Depreciation', amount: -15000 },
  ];
  const totalFixedAssets = fixedAssets.reduce((s, i) => s + i.amount, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const currentLiabilities = [
    { label: 'Accounts Payable', amount: 45600 },
    { label: 'Accrued Expenses', amount: 12500 },
    { label: 'Sales Tax Payable', amount: 3200 },
    { label: 'Unearned Revenue', amount: 8500 },
  ];
  const totalCurrentLiabilities = currentLiabilities.reduce((s, i) => s + i.amount, 0);

  const longTermLiabilities = [{ label: 'Long-term Debt', amount: 85000 }];
  const totalLongTermLiabilities = longTermLiabilities.reduce((s, i) => s + i.amount, 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

  const equityItems = [
    { label: "Owner's Equity", amount: 150000 },
    { label: 'Retained Earnings', amount: 85350 },
  ];
  const totalEquity = equityItems.reduce((s, i) => s + i.amount, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const isBalanced = totalAssets === totalLiabilitiesAndEquity;

  const lines: ReportLine[] = [
    { label: 'ASSETS', isHeader: true },
    { label: 'Current Assets', isSubHeader: true },
    ...currentAssets.map((i) => ({ label: i.label, amount: i.amount, indent: 2 })),
    { label: 'Total Current Assets', amount: totalCurrentAssets, isSectionTotal: true, indent: 1 },
    { label: '' },
    { label: 'Fixed Assets', isSubHeader: true },
    ...fixedAssets.map((i) => ({ label: i.label, amount: i.amount, indent: 2 })),
    { label: 'Total Fixed Assets', amount: totalFixedAssets, isSectionTotal: true, indent: 1 },
    { label: '' },
    { label: 'TOTAL ASSETS', amount: totalAssets, isGrandTotal: true },
    { label: '' },
    { label: 'LIABILITIES', isHeader: true },
    { label: 'Current Liabilities', isSubHeader: true },
    ...currentLiabilities.map((i) => ({ label: i.label, amount: i.amount, indent: 2 })),
    { label: 'Total Current Liabilities', amount: totalCurrentLiabilities, isSectionTotal: true, indent: 1 },
    { label: '' },
    { label: 'Long-term Liabilities', isSubHeader: true },
    ...longTermLiabilities.map((i) => ({ label: i.label, amount: i.amount, indent: 2 })),
    { label: 'Total Long-term Liabilities', amount: totalLongTermLiabilities, isSectionTotal: true, indent: 1 },
    { label: '' },
    { label: 'TOTAL LIABILITIES', amount: totalLiabilities, isGrandTotal: true },
    { label: '' },
    { label: 'EQUITY', isHeader: true },
    ...equityItems.map((i) => ({ label: i.label, amount: i.amount, indent: 1 })),
    { label: '' },
    { label: 'TOTAL EQUITY', amount: totalEquity, isGrandTotal: true },
    { label: '' },
    { label: 'TOTAL LIABILITIES & EQUITY', amount: totalLiabilitiesAndEquity, isGrandTotal: true },
  ];

  return { lines, isBalanced };
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState<string>('2026-03-31');
  const [generated, setGenerated] = useState(true);

  const { lines, isBalanced } = useMemo(() => buildBalanceSheetData(), []);

  const handleExportCsv = useCallback(() => {
    const headers = ['', 'Amount'];
    const csvRows = lines
      .filter((line) => line.label !== '')
      .map((line) => {
        const indent = '  '.repeat(line.indent ?? 0);
        const amt = line.amount !== undefined && !line.isHeader && !line.isSubHeader
          ? line.amount.toFixed(2)
          : '';
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
        onGenerate={() => setGenerated(true)}
        onExportCsv={handleExportCsv}
      />

      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Balance Sheet</h3>
                <p className="text-xs text-muted-foreground">As of {asOfDate}</p>
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

                if (line.isSubHeader) {
                  return (
                    <div key={idx} className="flex items-center h-7 px-3" style={{ paddingLeft: 20 }}>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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

                if (line.isSectionTotal) {
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between h-8 px-3 border-t border-foreground/15"
                      style={{ paddingLeft: (line.indent ?? 0) * 20 }}
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
                  <div
                    key={idx}
                    className="flex items-center justify-between h-7 px-3"
                    style={{ paddingLeft: (line.indent ?? 0) * 20 }}
                  >
                    <span className="text-sm">{line.label}</span>
                    <span
                      className={`erp-number ${(line.amount ?? 0) < 0 ? 'text-red-600' : ''}`}
                    >
                      {formatAmount(line.amount ?? 0)}
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
