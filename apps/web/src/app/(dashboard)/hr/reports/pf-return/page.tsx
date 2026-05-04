'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import { usePfReturn, downloadCsv } from '@/hooks/use-hr-reports';

const MONTHS = [
  { v: '04', label: 'April' }, { v: '05', label: 'May' }, { v: '06', label: 'June' },
  { v: '07', label: 'July' }, { v: '08', label: 'August' }, { v: '09', label: 'September' },
  { v: '10', label: 'October' }, { v: '11', label: 'November' }, { v: '12', label: 'December' },
  { v: '01', label: 'January' }, { v: '02', label: 'February' }, { v: '03', label: 'March' },
];

export default function PfReturnPage() {
  const [fy, setFy] = useState('2025-26');
  const [month, setMonth] = useState('04');
  const { data, isLoading, isError } = usePfReturn(fy, month);

  const handleCsv = () => {
    if (!data) return;
    const headers = ['Employee Code', 'Employee Name', 'UAN', 'Basic', 'EPF (12%)', 'EPS (8.33%)', 'Employer EPF Total'];
    const rows = data.rows.map((r) => [
      r.employeeCode,
      r.employeeName,
      r.uanNumber ?? '',
      r.basic.toFixed(2),
      r.epf.toFixed(2),
      r.eps.toFixed(2),
      r.employerEpfTotal.toFixed(2),
    ]);
    downloadCsv(`pf-return-${fy}-${month}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">PF Return</h1>
        <p className="text-sm text-muted-foreground">Monthly EPF/EPS contributions for ECR upload.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="fy">Fiscal Year</Label>
            <Input id="fy" value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2025-26" className="w-32" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="month">Month</Label>
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 w-44 rounded-md border bg-background px-3 text-sm"
            >
              {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </div>
          <Button variant="outline" onClick={handleCsv} disabled={!data} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">PF Return — {data?.period ?? '—'}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load PF return.</p>
          ) : !data || data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll entries for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">UAN</th>
                    <th className="py-2 pr-3 text-right">Basic</th>
                    <th className="py-2 pr-3 text-right">EPF (12%)</th>
                    <th className="py-2 pr-3 text-right">EPS (8.33%)</th>
                    <th className="py-2 text-right">Er. EPF Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.employeeId} className="border-b">
                      <td className="py-2 pr-3">{r.employeeCode}</td>
                      <td className="py-2 pr-3">{r.employeeName}</td>
                      <td className="py-2 pr-3">{r.uanNumber ?? '—'}</td>
                      <td className="py-2 pr-3 text-right">{r.basic.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right">{r.epf.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right">{r.eps.toFixed(2)}</td>
                      <td className="py-2 text-right">{r.employerEpfTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={3} className="py-2 pr-3">Total</td>
                    <td className="py-2 pr-3 text-right">{data.totals.basic.toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right">{data.totals.epf.toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right">{data.totals.eps.toFixed(2)}</td>
                    <td className="py-2 text-right">{data.totals.employerEpfTotal.toFixed(2)}</td>
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
