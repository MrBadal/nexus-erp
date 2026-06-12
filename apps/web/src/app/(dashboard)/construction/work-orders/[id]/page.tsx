'use client';

import { apiErrorMessage } from '@/lib/api';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConstructionWorkOrder, useApproveConstructionWorkOrder } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-emerald-100 text-emerald-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
  on_hold: 'bg-amber-100 text-amber-700',
};

const woTypeLabels: Record<string, string> = {
  subcontract: 'Subcontract',
  supply: 'Supply',
  labour: 'Labour',
  service: 'Service',
  equipment_hire: 'Equipment Hire',
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words">{value ?? '—'}</span>
    </div>
  );
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');

  const { data: wo, isLoading, isError } = useConstructionWorkOrder(id);
  const approveMutation = useApproveConstructionWorkOrder();

  const handleApprove = () => {
    approveMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Work Order approved — TDS liability posted to Finance GL');
      },
      onError: (err) => {
        toast.error(apiErrorMessage(err, 'Approval failed. Please try again.'));
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading work order...</div>
    );
  }

  if (isError || !wo) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load work order. Please try again.
      </div>
    );
  }

  const orderValue = parseFloat(wo.orderValue || '0');
  const totalPaid = parseFloat(wo.totalPaid || '0');
  const tdsDeducted = parseFloat(wo.tdsDeducted || '0');
  const retentionHeld = parseFloat(wo.retentionHeld || '0');
  const tdsRate = parseFloat(wo.tdsRate || '0');
  const gstRate = parseFloat(wo.gstRate || '0');
  const retentionPercentage = parseFloat(wo.retentionPercentage || '0');

  const typeLabel = woTypeLabels[wo.type] ?? wo.type;
  const isApprovedOrActive = wo.status === 'approved' || wo.status === 'active';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/construction" className="hover:text-foreground">Construction</Link>
            <span>&rsaquo;</span>
            <Link href="/construction/work-orders" className="hover:text-foreground">Work Orders</Link>
            <span>&rsaquo;</span>
            <span className="font-mono">{wo.workOrderNumber}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{typeLabel} Work Order</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[wo.status] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {wo.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {wo.workOrderNumber} &middot; {wo.vendorName}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {wo.status === 'draft' && (
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Approving...' : 'Approve Work Order'}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Order Value</div>
            <div className="text-2xl font-bold mt-1">
              ₹{orderValue.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Paid</div>
            <div className="text-2xl font-bold mt-1 text-emerald-700">
              ₹{totalPaid.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">TDS Deducted</div>
            <div className="text-2xl font-bold mt-1 text-amber-700">
              ₹{tdsDeducted.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Retention Held</div>
            <div className="text-2xl font-bold mt-1 text-blue-700">
              ₹{retentionHeld.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Work Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Order Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <DetailRow label="Vendor Name" value={wo.vendorName} />
            <DetailRow
              label="Vendor GSTIN"
              value={wo.vendorGstin ?? <span className="text-muted-foreground italic">Not provided</span>}
            />
            <DetailRow
              label="Vendor PAN"
              value={
                wo.vendorPan ? (
                  <span className="font-mono text-xs">{wo.vendorPan}</span>
                ) : (
                  <span className="text-muted-foreground italic">Not provided</span>
                )
              }
            />
            <DetailRow
              label="Vendor Type"
              value={
                wo.vendorType === 'individual_huf'
                  ? 'Individual / HUF'
                  : wo.vendorType === 'company_firm'
                  ? 'Company / Firm / LLP'
                  : wo.vendorType ?? '—'
              }
            />
            <DetailRow
              label="Scope of Work"
              value={<span className="whitespace-pre-line">{wo.scopeOfWork}</span>}
            />
            <DetailRow
              label="Start Date"
              value={wo.startDate ? new Date(wo.startDate).toLocaleDateString('en-IN') : '—'}
            />
            <DetailRow
              label="End Date"
              value={wo.endDate ? new Date(wo.endDate).toLocaleDateString('en-IN') : '—'}
            />
          </CardContent>
        </Card>

        {/* TDS & Financial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">TDS &amp; Financial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y">
            <DetailRow
              label="TDS Applicable"
              value={
                wo.tdsApplicable ? (
                  <span className="text-amber-700 font-medium">Yes</span>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )
              }
            />
            <DetailRow
              label="TDS Section"
              value={wo.tdsApplicable ? wo.tdsSection || '194C' : '—'}
            />
            <DetailRow
              label="TDS Rate"
              value={
                wo.tdsApplicable ? (
                  <span className="font-medium">{tdsRate}%</span>
                ) : (
                  'Nil'
                )
              }
            />
            <DetailRow label="GST Rate" value={`${gstRate}%`} />
            <DetailRow label="Retention" value={`${retentionPercentage}%`} />

            {wo.tdsApplicable && (
              <div className="pt-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  TDS deducted on each payment is to be deposited with the Government of India
                  under Section 194C of the Income Tax Act, 1961.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {wo.payments && wo.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payment #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gross</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">GST</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">TDS</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Retention</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net Payable</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {wo.payments.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{p.paymentNumber}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₹{parseFloat(p.grossAmount || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        ₹{parseFloat(p.gstAmount || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-red-700">
                        ₹{parseFloat(p.tdsAmount || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-700">
                        ₹{parseFloat(p.retentionAmount || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ₹{parseFloat(p.netPayable || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[p.status] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No payments recorded yet for this work order.
            </div>
          )}
        </CardContent>
      </Card>

      {/* GL Posting Info */}
      {isApprovedOrActive && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">GL Posting on Payment Approval</p>
          <p className="text-blue-800">
            DR Subcontractor Expense &nbsp;/&nbsp; CR Accounts Payable &nbsp;/&nbsp;
            CR TDS Payable (194C) &nbsp;/&nbsp; CR Retention Payable
          </p>
        </div>
      )}
    </div>
  );
}
