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
import { useTdsPayment } from '@/hooks/use-reports';
import { formatCurrency } from '@/lib/utils';

export default function TdsPaymentPage() {
  const [fiscalYear, setFiscalYear] = useState<string>('');
  const [quarter, setQuarter] = useState<string>('');
  const [submittedFY, setSubmittedFY] = useState<string>('');
  const [submittedQ, setSubmittedQ] = useState<number | undefined>(undefined);

  const { data, isLoading } = useTdsPayment(submittedFY, submittedQ, !!submittedFY);

  const rows = data?.rows ?? [];
  const totalGross = data?.totalGross ?? 0;
  const totalTds = data?.totalTds ?? 0;

  const handleGenerate = () => {
    setSubmittedFY(fiscalYear);
    setSubmittedQ(quarter ? parseInt(quarter, 10) : undefined);
  };

  const handleExportCsv = useCallback(() => {
    const headers = ['Supplier', 'PAN', 'Section', 'Gross Amount', 'TDS Rate (%)', 'TDS Amount', 'Status'];
    const csvRows = rows.map((r) =>
      [`"${r.supplierName}"`, r.panNumber, r.section, r.grossAmount.toFixed(2), r.tdsRate.toFixed(2), r.tdsAmount.toFixed(2), r.status].join(',')
    );
    csvRows.push(['TOTALS', '', '', totalGross.toFixed(2), '', totalTds.toFixed(2), ''].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tds-payment-${submittedFY}-Q${submittedQ ?? 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, totalGross, totalTds, submittedFY, submittedQ]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="TDS Payment Report"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Reports', href: '/finance/reports' },
          { label: 'TDS Payment' },
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
          <label className="text-xs font-medium text-muted-foreground">Quarter (optional)</label>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="h-8 w-[120px] text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="1">Q1</SelectItem>
              <SelectItem value="2">Q2</SelectItem>
              <SelectItem value="3">Q3</SelectItem>
              <SelectItem value="4">Q4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-8" onClick={handleGenerate} disabled={!fiscalYear || isLoading}>
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
        ) : !submittedFY ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Enter fiscal year and click &quot;Generate&quot; to load the report
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold">TDS Payment Report</h3>
                <p className="text-xs text-muted-foreground">
                  FY {submittedFY} {submittedQ ? `| Quarter ${submittedQ}` : '| All Quarters'} | {rows.length} entries
                </p>
              </div>

              <table className="erp-table w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Supplier</th>
                    <th className="text-left">PAN</th>
                    <th className="text-left">Section</th>
                    <th className="text-right">Gross Amount</th>
                    <th className="text-right">TDS Rate</th>
                    <th className="text-right">TDS Amount</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No data found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.supplierId}>
                        <td className="text-left">{r.supplierName}</td>
                        <td className="text-left font-mono text-xs">{r.panNumber}</td>
                        <td className="text-left text-xs">{r.section}</td>
                        <td className="erp-number">{formatCurrency(r.grossAmount)}</td>
                        <td className="erp-number">{r.tdsRate}%</td>
                        <td className="erp-number">{formatCurrency(r.tdsAmount)}</td>
                        <td className="text-left">
                          <span className="capitalize text-xs">{r.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-foreground/20 font-semibold">
                      <td colSpan={3} className="text-right font-semibold">Totals</td>
                      <td className="erp-number font-bold">{formatCurrency(totalGross)}</td>
                      <td className="erp-number"></td>
                      <td className="erp-number font-bold">{formatCurrency(totalTds)}</td>
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
