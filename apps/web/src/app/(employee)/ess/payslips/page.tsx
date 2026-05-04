'use client';

import * as React from 'react';
import { Wallet, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useEssPayrollEntries, downloadEssPayslipPdf } from '@/hooks/use-ess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatINR(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(n)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPeriod(period: string): string {
  const [y, m] = period.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[parseInt(m, 10) - 1] ?? m} ${y}`;
}

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'approved':
      return 'secondary';
    case 'submitted':
      return 'outline';
    default:
      return 'outline';
  }
}

export default function EssPayslipsPage() {
  const { data, isLoading } = useEssPayrollEntries();
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const handleDownload = async (id: string, period: string) => {
    setDownloadingId(id);
    try {
      await downloadEssPayslipPdf(id, period);
      toast.success('Payslip downloaded');
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Payslips</h1>
        <p className="text-sm text-muted-foreground">
          Download monthly payslips as PDF.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Wallet className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">All Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payslips have been generated yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {formatPeriod(p.period)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatINR(p.grossPay)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatINR(p.totalDeductions)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatINR(p.netPay)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(p.id, p.period)}
                        disabled={downloadingId === p.id}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        {downloadingId === p.id ? 'Loading…' : 'PDF'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
