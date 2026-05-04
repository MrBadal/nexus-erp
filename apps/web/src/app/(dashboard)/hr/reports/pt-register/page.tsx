'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import { usePtRegister, downloadCsv } from '@/hooks/use-hr-reports';

const MONTHS = [
  { v: '04', label: 'April' }, { v: '05', label: 'May' }, { v: '06', label: 'June' },
  { v: '07', label: 'July' }, { v: '08', label: 'August' }, { v: '09', label: 'September' },
  { v: '10', label: 'October' }, { v: '11', label: 'November' }, { v: '12', label: 'December' },
  { v: '01', label: 'January' }, { v: '02', label: 'February' }, { v: '03', label: 'March' },
];

export default function PtRegisterPage() {
  const [fy, setFy] = useState('2025-26');
  const [month, setMonth] = useState('04');
  const { data, isLoading, isError } = usePtRegister(fy, month);

  const handleCsv = () => {
    if (!data) return;
    const headers = ['Employee Code', 'Employee Name', 'State', 'PT Amount'];
    const rows = data.rows.map((r) => [r.employeeCode, r.employeeName, r.state ?? '', r.amount.toFixed(2)]);
    downloadCsv(`pt-register-${fy}-${month}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Professional Tax Register</h1>
        <p className="text-sm text-muted-foreground">PT deductions per employee, grouped by state.</p>
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
            <select id="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="h-9 w-44 rounded-md border bg-background px-3 text-sm">
              {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </div>
          <Button variant="outline" onClick={handleCsv} disabled={!data} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </CardContent>
      </Card>

      {data && Object.keys(data.byState).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">By State</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(data.byState).map(([state, amount]) => (
                <div key={state} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">{state}</div>
                  <div className="text-lg font-semibold">₹{amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">PT Register — {data?.period ?? '—'}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load PT register.</p>
          ) : !data || data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No PT deductions for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">State</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.employeeId} className="border-b">
                      <td className="py-2 pr-3">{r.employeeCode}</td>
                      <td className="py-2 pr-3">{r.employeeName}</td>
                      <td className="py-2 pr-3">{r.state ?? '—'}</td>
                      <td className="py-2 text-right">{r.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={3} className="py-2 pr-3">Total</td>
                    <td className="py-2 text-right">{data.total.toFixed(2)}</td>
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
