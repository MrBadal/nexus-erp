'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DollarSign, Users, Calendar, FileText, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { usePayrollEntries } from '@/hooks/use-hr';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

export default function PayrollPage() {
  const router = useRouter();
  const { data: apiPayroll, isLoading } = usePayrollEntries();

  const payrollHistory = (apiPayroll ?? []).map((p) => ({
    id: p.id,
    period: p.period,
    employees: p.employees ?? 1,
    grossPay: p.grossPay,
    deductions: p.totalDeductions ?? p.deductions ?? 0,
    netPay: p.netPay,
    status: p.status,
  }));

  const latestPayroll = payrollHistory[0];
  const totalGross = payrollHistory.reduce((sum, p) => sum + p.grossPay, 0);
  const totalEmployees = latestPayroll?.employees ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/hr" className="hover:text-foreground">HR</Link>
            <span>&rsaquo;</span>
            <span>Payroll</span>
          </div>
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-sm text-muted-foreground">Process and manage employee payroll</p>
        </div>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" /> Process Payroll
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading payroll data...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest Gross</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestPayroll ? formatCurrency(latestPayroll.grossPay) : '\u2014'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestPayroll?.period ?? 'No payroll yet'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="mt-1 text-xs text-muted-foreground">In latest payroll</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Salary</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestPayroll && totalEmployees > 0
                ? formatCurrency(Math.round(latestPayroll.grossPay / totalEmployees))
                : '\u2014'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Per employee</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollHistory.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Payroll periods</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payroll History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Employees</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gross Pay</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Deductions</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net Pay</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3" colSpan={6}>
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : payrollHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No payroll entries yet. Process your first payroll to get started.
                    </td>
                  </tr>
                ) : (
                  payrollHistory.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => router.push(`/hr/payroll/${p.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{p.period}</td>
                      <td className="px-4 py-3 text-right">{p.employees}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.grossPay)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{formatCurrency(p.deductions)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(p.netPay)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusColors[p.status] || 'bg-gray-100 text-gray-700'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
