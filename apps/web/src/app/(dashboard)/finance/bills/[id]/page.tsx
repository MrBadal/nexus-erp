'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBill, useApproveBill, useVoidBill } from '@/hooks/use-bills';

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: bill, isLoading } = useBill(id);
  const approveBill = useApproveBill();
  const voidBill = useVoidBill();

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!bill) return <div className="p-6">Bill not found</div>;

  const handleApprove = async () => {
    try {
      await approveBill.mutateAsync(id);
      toast.success('Bill approved successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve bill');
    }
  };

  const handleVoid = async () => {
    try {
      await voidBill.mutateAsync(id);
      toast.success('Bill voided');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to void bill');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <Link href="/finance" className="hover:text-foreground">Finance</Link>
              <span>{'\u203A'}</span>
              <Link href="/finance/bills" className="hover:text-foreground">Bills</Link>
              <span>{'\u203A'}</span>
              <span>{bill.billNumber}</span>
            </div>
            <h1 className="text-2xl font-bold">{bill.billNumber}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {(bill.status === 'draft' || bill.status === 'received') && (
            <Button onClick={handleApprove} disabled={approveBill.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />Approve
            </Button>
          )}
          {bill.status !== 'void' && bill.status !== 'cancelled' && (
            <Button variant="destructive" onClick={handleVoid} disabled={voidBill.isPending}>
              <XCircle className="mr-2 h-4 w-4" />Void
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bill Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Bill Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary">{bill.status.replace('_', ' ')}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor Invoice</span>
              <span>{bill.vendorInvoiceNumber || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue Date</span>
              <span>{bill.issueDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span>{bill.dueDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">3-Way Match</span>
              <span>{bill.threeWayMatchStatus || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Financial Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{'\u20B9'}{parseFloat(bill.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{'\u20B9'}{parseFloat(bill.taxAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{'\u20B9'}{parseFloat(bill.total).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{'\u20B9'}{parseFloat(bill.amountPaid).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-medium text-destructive">
              <span>Balance Due</span>
              <span>{'\u20B9'}{parseFloat(bill.balanceDue).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TDS Info Card */}
      {parseFloat(bill.tdsAmount) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">TDS Deduction</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground">TDS Rate</p>
              <p className="font-medium">{bill.tdsRate ? `${bill.tdsRate}%` : '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">TDS Amount</p>
              <p className="font-medium text-orange-600">{'\u20B9'}{parseFloat(bill.tdsAmount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Net Payable</p>
              <p className="font-medium">{'\u20B9'}{(parseFloat(bill.total) - parseFloat(bill.tdsAmount)).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Deduction Status</p>
              <Badge variant="outline">Deducted at approval</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RCM Indicator */}
      {bill.rcmApplicable && (
        <Card>
          <CardHeader><CardTitle className="text-base">Reverse Charge Mechanism (RCM)</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p>
              This bill is subject to RCM. A separate journal entry for Input GST (DR)
              and RCM Liability (CR) has been posted for {'\u20B9'}{parseFloat(bill.taxAmount).toLocaleString()}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bill Lines */}
      <Card>
        <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>ITC</TableHead>
                <TableHead>RCM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.lines?.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.lineNumber}</TableCell>
                  <TableCell>{line.description || '-'}</TableCell>
                  <TableCell>{line.hsnCode || '-'}</TableCell>
                  <TableCell className="text-right">{parseFloat(line.quantity).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{'\u20B9'}{parseFloat(line.unitPrice).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{'\u20B9'}{parseFloat(line.taxAmount).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">{'\u20B9'}{parseFloat(line.lineTotal).toLocaleString()}</TableCell>
                  <TableCell>
                    {line.itcEligible ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">Eligible</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800" title={line.itcBlockReason || 'Blocked'}>Blocked</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {line.rcmApplicable ? (
                      <Badge variant="outline" className="text-purple-700">RCM</Badge>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {!bill.lines?.length && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-6">No line items</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
