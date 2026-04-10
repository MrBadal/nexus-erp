'use client';

import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBills } from '@/hooks/use-bills';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  received: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
  void: 'bg-gray-100 text-gray-500',
};

export default function BillsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: bills, isLoading } = useBills(statusFilter ? { status: statusFilter } : undefined);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bills</h1>
          <p className="text-sm text-muted-foreground">Manage vendor bills and invoices</p>
        </div>
        <Link href="/finance/bills/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Bill</Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading bills...</div>
          ) : !bills?.length ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No bills found. Create your first bill.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Vendor Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>TDS</TableHead>
                  <TableHead>RCM</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <Link href={`/finance/bills/${bill.id}`} className="font-medium text-primary hover:underline">
                        {bill.billNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{bill.vendorInvoiceNumber || '-'}</TableCell>
                    <TableCell>{bill.issueDate}</TableCell>
                    <TableCell>{bill.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[bill.status] || ''}>
                        {bill.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {parseFloat(bill.tdsAmount) > 0 ? (
                        <Badge variant="outline" className="text-orange-700">
                          {'\u20B9'}{parseFloat(bill.tdsAmount).toLocaleString()}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {bill.rcmApplicable ? (
                        <Badge variant="outline" className="text-purple-700">RCM</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {'\u20B9'}{parseFloat(bill.total).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {'\u20B9'}{parseFloat(bill.balanceDue).toLocaleString()}
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
