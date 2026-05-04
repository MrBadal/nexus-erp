'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import { useTdsQuarterly, downloadCsv } from '@/hooks/use-hr-reports';

const QUARTERS = [
  { v: 'Q1', label: 'Q1 — Apr–Jun' },
  { v: 'Q2', label: 'Q2 — Jul–Sep' },
  { v: 'Q3', label: 'Q3 — Oct–Dec' },
  { v: 'Q4', label: 'Q4 — Jan–Mar' },
];

export default function TdsQuarterlyPage() {
  const [fy, setFy] = useState('2025-26');
  const [quarter, setQuarter] = useState('Q1');
  const { data, isLoading, isError } = useTdsQuarterly(fy, quarter);

  const handleCsv = () => {
    if (!data) return;
    const headers = ['Employee Code', 'Employee Name', 'PAN', 'Period', 'TDS'];
    const rows = data.rows.map((r) => [r.employeeCode, r.employeeName, r.panNumber ?? '', r.period, r.tds.toFixed(2)]);
    downloadCsv(`tds-quarterly-${fy}-${quarter}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">TDS Quarterly Report</h1>
        <p className="text-sm text-muted-foreground">Quarterly TDS deductions for Form 24Q filing.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="fy">Fiscal Year</Label>
            <Input id="fy" value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2025-26" className="w-32" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="q">Quarter</Label>
            <select id="q" value={quarter} onChange={(e) => setQuarter(e.target.value)}
              className="h-9 w-48 rounded-md border bg-background px-3 text-sm">
              {QUARTERS.map((q) => <option key={q.v} value={q.v}>{q.label}</option>)}
            </select>
          </div>
          <Button variant="outline" onClick={handleCsv} disabled={!data} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">TDS — {fy} {quarter}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load TDS report.</p>
          ) : !data || data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No TDS deductions for this quarter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">PAN</th>
                    <th className="py-2 pr-3">Period</th>
                    <th className="py-2 text-right">TDS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={`${r.employeeId}-${r.period}-${i}`} className="border-b">
                      <td className="py-2 pr-3">{r.employeeCode}</td>
                      <td className="py-2 pr-3">{r.employeeName}</td>
                      <td className="py-2 pr-3">{r.panNumber ?? '—'}</td>
                      <td className="py-2 pr-3">{r.period}</td>
                      <td className="py-2 text-right">{r.tds.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={4} className="py-2 pr-3">Total TDS</td>
                    <td className="py-2 text-right">{data.totals.tds.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
