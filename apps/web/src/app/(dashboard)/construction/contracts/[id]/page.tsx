'use client';

import { apiErrorMessage } from '@/lib/api';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContract, useUpdateContractStatus } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  tendering: 'bg-blue-100 text-blue-700',
  awarded: 'bg-indigo-100 text-indigo-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-500',
  terminated: 'bg-red-100 text-red-700',
  on_hold: 'bg-amber-100 text-amber-700',
};

const contractTypeLabels: Record<string, string> = {
  lump_sum: 'Lump Sum',
  item_rate: 'Item Rate',
  cost_plus: 'Cost Plus',
  epc: 'EPC',
  turnkey: 'Turnkey',
  labour_only: 'Labour Only',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');

  const { data: contract, isLoading, isError } = useContract(id);
  const updateStatus = useUpdateContractStatus();

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Contract status updated to ${newStatus.replace('_', ' ')}`);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to update contract status.'));
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-muted rounded w-48" />
          <div className="h-7 bg-muted rounded w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p className="text-lg font-medium">Contract not found.</p>
        <Link href="/construction/contracts" className="text-primary underline text-sm mt-2 inline-block">
          Back to Contracts
        </Link>
      </div>
    );
  }

  const contractValue = parseFloat(contract.contractValue || '0');
  const totalBilled = parseFloat(contract.totalBilled || '0');
  const totalReceived = parseFloat(contract.totalReceived || '0');
  const retentionHeld = parseFloat(contract.retentionHeld || '0');
  const completionPct = parseFloat(contract.completionPercentage || '0');
  const outstanding = totalBilled - totalReceived;

  const boqItems = contract.boqItems ?? [];
  const boqTotalAmount = boqItems.reduce((s, item) => s + parseFloat(item.amount || '0'), 0);
  const boqTotalBilled = boqItems.reduce((s, item) => s + parseFloat(item.amountBilled || '0'), 0);

  const statusColor = statusColors[contract.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/construction" className="hover:text-foreground">Construction</Link>
            <span>&rsaquo;</span>
            <Link href="/construction/contracts" className="hover:text-foreground">Contracts</Link>
            <span>&rsaquo;</span>
            <span className="font-mono">{contract.contractNumber}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{contract.name}</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {contract.contractNumber}
            </Badge>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
            >
              {contract.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {contract.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('active')}
              disabled={updateStatus.isPending}
            >
              Activate
            </Button>
          )}
          {contract.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('completed')}
              disabled={updateStatus.isPending}
            >
              Mark Completed
            </Button>
          )}
          {contract.status !== 'completed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('on_hold')}
              disabled={updateStatus.isPending}
            >
              Put On Hold
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Contract Value</div>
            <div className="text-xl font-bold mt-1">
              ₹{contractValue.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Billed</div>
            <div className="text-xl font-bold mt-1 text-blue-600">
              ₹{totalBilled.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Retention Held</div>
            <div className="text-xl font-bold mt-1 text-amber-600">
              ₹{retentionHeld.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Completion</div>
            <div className="text-xl font-bold mt-1 text-emerald-600">
              {completionPct.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Contract Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contract Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border px-4 pb-4">
            <InfoRow label="Client Name" value={contract.clientName} />
            <InfoRow label="Client GSTIN" value={contract.clientGstin} />
            <InfoRow
              label="Contract Type"
              value={contractTypeLabels[contract.contractType] ?? contract.contractType}
            />
            <InfoRow label="State" value={contract.state} />
            <InfoRow label="Project Location" value={contract.projectLocation} />
            <InfoRow
              label="Start Date"
              value={contract.startDate ? new Date(contract.startDate).toLocaleDateString('en-IN') : undefined}
            />
            <InfoRow
              label="End Date"
              value={contract.endDate ? new Date(contract.endDate).toLocaleDateString('en-IN') : undefined}
            />
            <InfoRow
              label="RERA Applicable"
              value={
                contract.isReraApplicable ? (
                  <span className="text-emerald-600">
                    Yes{contract.reraNumber ? ` — ${contract.reraNumber}` : ''}
                  </span>
                ) : (
                  'No'
                )
              }
            />
            <InfoRow
              label="BOCW Cess Applicable"
              value={contract.isBocwApplicable ? <span className="text-emerald-600">Yes</span> : 'No'}
            />
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border px-4 pb-4">
            <InfoRow label="Contract Value (₹)" value={`₹${contractValue.toLocaleString('en-IN')}`} />
            <InfoRow label="GST Rate (%)" value={`${parseFloat(contract.gstRate || '0').toFixed(2)}%`} />
            <InfoRow
              label="Retention (%)"
              value={`${parseFloat(contract.retentionPercentage || '0').toFixed(2)}%`}
            />
            <InfoRow
              label="Mobilisation Advance (₹)"
              value={`₹${parseFloat(contract.mobilisationAdvance || '0').toLocaleString('en-IN')}`}
            />
            <InfoRow label="Total Billed (₹)" value={`₹${totalBilled.toLocaleString('en-IN')}`} />
            <InfoRow label="Total Received (₹)" value={`₹${totalReceived.toLocaleString('en-IN')}`} />
            <InfoRow
              label="Outstanding (₹)"
              value={
                <span className={outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}>
                  ₹{outstanding.toLocaleString('en-IN')}
                </span>
              }
            />
            <InfoRow label="Retention Held (₹)" value={`₹${retentionHeld.toLocaleString('en-IN')}`} />
          </CardContent>
        </Card>
      </div>

      {/* BOQ Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bill of Quantities (BOQ)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {boqItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate (₹)</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount (₹)</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty Executed</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount Billed (₹)</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {boqItems.map((item) => {
                    const amount = parseFloat(item.amount || '0');
                    const amountBilled = parseFloat(item.amountBilled || '0');
                    const pct = amount > 0 ? (amountBilled / amount) * 100 : 0;
                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">{item.itemCode}</td>
                        <td className="px-4 py-3 max-w-xs">
                          <span className="line-clamp-2">{item.description}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                        <td className="px-4 py-3 text-right">
                          {parseFloat(item.quantity || '0').toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {parseFloat(item.rate || '0').toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {parseFloat(item.quantityExecuted || '0').toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600">
                          {amountBilled.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-xs font-medium ${
                              pct >= 100
                                ? 'text-emerald-600'
                                : pct >= 50
                                ? 'text-blue-600'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50 font-semibold">
                    <td className="px-4 py-3" colSpan={5}>Total</td>
                    <td className="px-4 py-3 text-right">
                      {boqTotalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-emerald-600">
                      {boqTotalBilled.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium">
                      {boqTotalAmount > 0
                        ? ((boqTotalBilled / boqTotalAmount) * 100).toFixed(1)
                        : '0.0'}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-muted-foreground">
              <p className="text-sm">No BOQ items added to this contract yet.</p>
              <p className="text-xs mt-1 text-muted-foreground/70">Add BOQ items via API</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {contract.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
