'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useConstructionWorkOrders, useApproveConstructionWorkOrder } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-emerald-100 text-emerald-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
};

const typeColors: Record<string, string> = {
  subcontractor: 'bg-purple-100 text-purple-700',
  supplier: 'bg-blue-100 text-blue-700',
  labour: 'bg-amber-100 text-amber-700',
  service: 'bg-emerald-100 text-emerald-700',
};

export default function WorkOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: workOrders } = useConstructionWorkOrders();
  const approveMutation = useApproveConstructionWorkOrder();

  const filtered = (workOrders || []).filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.workOrderNumber.toLowerCase().includes(q) ||
      w.vendorName.toLowerCase().includes(q)
    );
  });

  const totalOrderValue = filtered.reduce((s, w) => s + parseFloat(w.orderValue || '0'), 0);
  const totalTds = filtered.reduce((s, w) => s + parseFloat(w.tdsDeducted || '0'), 0);

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await approveMutation.mutateAsync(id);
      toast('Work order approved');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approval failed'));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/construction" className="hover:text-foreground">Construction</Link>
            <span>&rsaquo;</span><span>Work Orders</span>
          </div>
          <h1 className="text-2xl font-bold">Work Orders</h1>
          <p className="text-sm text-muted-foreground">
            Subcontractor & supplier orders — TDS u/s 194C auto-deducted on payment approval
          </p>
        </div>
        <Link href="/construction/work-orders/new">
          <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Work Order</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total WOs</div>
          <div className="text-2xl font-bold">{filtered.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold text-blue-600">{filtered.filter((w) => ['approved', 'active'].includes(w.status)).length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Order Value</div>
          <div className="text-2xl font-bold">₹{(totalOrderValue / 100000).toFixed(1)}L</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">TDS Deducted</div>
          <div className="text-2xl font-bold text-amber-600">₹{totalTds.toLocaleString('en-IN')}</div>
        </CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search work orders..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">WO Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order Value</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">TDS Rate</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">TDS Section</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((wo) => (
                  <tr key={wo.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/construction/work-orders/${wo.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs">{wo.workOrderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{wo.vendorName}</div>
                      {wo.vendorPan && <div className="text-xs text-muted-foreground">PAN: {wo.vendorPan}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[wo.type] || ''}`}>
                        {wo.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">₹{parseFloat(wo.orderValue).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      {wo.tdsApplicable ? (
                        <span className="text-amber-700 font-medium">{wo.tdsRate}%</span>
                      ) : (
                        <span className="text-muted-foreground">Nil</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{wo.tdsApplicable ? wo.tdsSection : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[wo.status] || ''}`}>
                        {wo.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {wo.status === 'draft' && (
                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => handleApprove(e, wo.id)}>
                          Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No work orders found.{' '}
                      <Link href="/construction/work-orders/new" className="text-primary underline">Create the first work order</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
