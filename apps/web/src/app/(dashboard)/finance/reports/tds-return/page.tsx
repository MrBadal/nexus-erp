'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Play, Download } from 'lucide-react';
import { useTdsReturn } from '@/hooks/use-reports';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function TdsReturnPage() {
  const [fiscalYear, setFiscalYear] = useState<string>('');
  const [quarter, setQuarter] = useState<string>('');
  const [submittedFY, setSubmittedFY] = useState<string>('');
  const [submittedQ, setSubmittedQ] = useState<number>(0);

  const { data, isLoading } = useTdsReturn(submittedFY, submittedQ, !!submittedFY && !!submittedQ);

  const rows = data?.rows ?? [];
  const summary = data?.summary ?? { totalAmountPaid: 0, totalTdsDeducted: 0 };

  const handleGenerate = () => {
    if (!fiscalYear || !quarter) return;
    setSubmittedFY(fiscalYear);
    setSubmittedQ(parseInt(quarter, 10));
  };

  const handleExportCsv = useCallback(() => {
    const headers = ['Deductee Type', 'Deductee Name', 'PAN', 'Section', 'Date of Payment', 'Amount Paid', 'TDS Deducted', 'Date of Deduction'];
    const csvRows = rows.map((r) =>
      [r.deducteeType, `"${r.deducteeName}"`, r.pan, r.section, r.dateOfPayment, r.amountPaid.toFixed(2), r.tdsDeducted.toFixed(2), r.dateOfDeduction].join(',')
    );
    csvRows.push(['', 'TOTALS', '', '', '', summary.totalAmountPaid.toFixed(2), summary.totalTdsDeducted.toFixed(2), ''].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tds-return-26Q-${submittedFY}-Q${submittedQ}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, summary, submittedFY, submittedQ]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="TDS Return (26Q)"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Reports', href: '/finance/reports' },
          { label: 'TDS Return' },
        ]}
      />

      <div className="no-print flex flex-row items-end gap-3 px-6 py-3 border-b bg-muted/30 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Fiscal Year</label>
          <Input
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            placeholder="e.g. 2025-2026"
            className="h-8 w-[160px] text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Quarter</label>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="h-8 w-[120px] text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Q1</SelectItem>
              <SelectItem value="2">Q2</SelectItem>
              <SelectItem value="3">Q3</SelectItem>
              <SelectItem value="4">Q4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-8" onClick={handleGenerate} disabled={!fiscalYear || !quarter || isLoading}>
          <Play className="mr-1.5 h-3.5 w-3.5" />
          Generate
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={handleExportCsv} disabled={isLoading || rows.length === 0}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !submittedFY || !submittedQ ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Enter fiscal year and quarter, then click &quot;Generate&quot; to load the report
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold">TDS Return - Form 26Q</h3>
                <p className="text-xs text-muted-foreground">
                  FY {submittedFY} | Quarter {submittedQ} | {rows.length} deductees
                </p>
              </div>

              <table className="erp-table w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Type</th>
                    <th className="text-left">Deductee Name</th>
                    <th className="text-left">PAN</th>
                    <th className="text-left">Section</th>
                    <th className="text-left">Payment Date</th>
                    <th className="text-right">Amount Paid</th>
                    <th className="text-right">TDS Deducted</th>
                    <th className="text-left">Deduction Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        No data found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr key={idx}>
                        <td className="text-left text-xs">{r.deducteeType}</td>
                        <td className="text-left">{r.deducteeName}</td>
                        <td className="text-left font-mono text-xs">{r.pan}</td>
                        <td className="text-left text-xs">{r.section}</td>
                        <td className="text-left">{formatDate(r.dateOfPayment)}</td>
                        <td className="erp-number">{formatCurrency(r.amountPaid)}</td>
                        <td className="erp-number">{formatCurrency(r.tdsDeducted)}</td>
                        <td className="text-left">{formatDate(r.dateOfDeduction)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-foreground/20 font-semibold">
                      <td colSpan={5} className="text-right font-semibold">Totals</td>
                      <td className="erp-number font-bold">{formatCurrency(summary.totalAmountPaid)}</td>
                      <td className="erp-number font-bold">{formatCurrency(summary.totalTdsDeducted)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
