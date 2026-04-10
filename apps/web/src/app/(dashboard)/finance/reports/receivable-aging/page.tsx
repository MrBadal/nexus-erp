'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ReportFilters } from '@/components/finance/report-filters';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useReceivableAging } from '@/hooks/use-reports';
import { formatCurrency } from '@/lib/utils';

export default function ReceivableAgingPage() {
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data, isLoading } = useReceivableAging(asOfDate || undefined, shouldFetch);

  const buckets = data?.buckets ?? [];
  const totals = data?.totals ?? { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 };

  const handleExportCsv = useCallback(() => {
    const headers = ['Customer', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total'];
    const csvRows = buckets.map((b) =>
      [`"${b.entityName}"`, b.current.toFixed(2), b.days1to30.toFixed(2), b.days31to60.toFixed(2), b.days61to90.toFixed(2), b.over90.toFixed(2), b.total.toFixed(2)].join(',')
    );
    csvRows.push(['TOTALS', totals.current.toFixed(2), totals.days1to30.toFixed(2), totals.days31to60.toFixed(2), totals.days61to90.toFixed(2), totals.over90.toFixed(2), totals.total.toFixed(2)].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receivable-aging-${asOfDate || 'current'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buckets, totals, asOfDate]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Receivable Aging"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Reports', href: '/finance/reports' },
          { label: 'Receivable Aging' },
        ]}
      />

      <ReportFilters
        showAsOfDate
        asOfDate={asOfDate}
        onAsOfDateChange={setAsOfDate}
        onGenerate={() => setShouldFetch(true)}
        onExportCsv={handleExportCsv}
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !shouldFetch ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Click &quot;Generate&quot; to load the report
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold">Receivable Aging Report</h3>
                <p className="text-xs text-muted-foreground">
                  As of {asOfDate || 'current date'} | {buckets.length} customers
                </p>
              </div>

              <table className="erp-table w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Customer</th>
                    <th className="text-right">Current</th>
                    <th className="text-right">1-30 Days</th>
                    <th className="text-right">31-60 Days</th>
                    <th className="text-right">61-90 Days</th>
                    <th className="text-right">90+ Days</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No data found.
                      </td>
                    </tr>
                  ) : (
                    buckets.map((b) => (
                      <tr key={b.entityId}>
                        <td className="text-left">{b.entityName}</td>
                        <td className="erp-number">{formatCurrency(b.current)}</td>
                        <td className="erp-number">{formatCurrency(b.days1to30)}</td>
                        <td className="erp-number">{formatCurrency(b.days31to60)}</td>
                        <td className="erp-number">{formatCurrency(b.days61to90)}</td>
                        <td className="erp-number">{b.over90 > 0 ? <span className="text-red-600 font-medium">{formatCurrency(b.over90)}</span> : formatCurrency(b.over90)}</td>
                        <td className="erp-number font-semibold">{formatCurrency(b.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {buckets.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-foreground/20 font-semibold">
                      <td className="text-right font-semibold">Totals</td>
                      <td className="erp-number font-bold">{formatCurrency(totals.current)}</td>
                      <td className="erp-number font-bold">{formatCurrency(totals.days1to30)}</td>
                      <td className="erp-number font-bold">{formatCurrency(totals.days31to60)}</td>
                      <td className="erp-number font-bold">{formatCurrency(totals.days61to90)}</td>
                      <td className="erp-number font-bold">{formatCurrency(totals.over90)}</td>
                      <td className="erp-number font-bold">{formatCurrency(totals.total)}</td>
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
