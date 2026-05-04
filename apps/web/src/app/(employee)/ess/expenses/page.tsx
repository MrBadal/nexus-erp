'use client';

import * as React from 'react';
import Link from 'next/link';
import { Receipt, Plus } from 'lucide-react';
import { useEssExpenses } from '@/hooks/use-ess';
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

function statusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'approved':
      return 'default';
    case 'submitted':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    case 'cancelled':
      return 'outline';
    default:
      return 'outline';
  }
}

export default function EssExpensesPage() {
  const { data, isLoading } = useEssExpenses();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Submit and track reimbursement claims.
          </p>
        </div>
        <Link href="/ess/expenses/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            New claim
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Receipt className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">All Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              You haven't submitted any expense claims yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.claimNumber}</TableCell>
                    <TableCell>{c.claimDate}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {c.purpose ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatINR(c.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.approvedAmount ? formatINR(c.approvedAmount) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
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
