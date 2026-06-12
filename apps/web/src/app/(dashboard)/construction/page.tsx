'use client';

import Link from 'next/link';
import { FileText, HardHat, Truck, ClipboardList, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContracts, useRaBills, useConstructionWorkOrders } from '@/hooks/use-construction';

const modules = [
  { title: 'Contracts', desc: 'Manage construction contracts & BOQ', href: '/construction/contracts', icon: FileText, color: 'text-blue-600 bg-blue-50' },
  { title: 'RA Bills', desc: 'Running Account Bills & certification', href: '/construction/ra-bills', icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
  { title: 'Work Orders', desc: 'Subcontractor & supplier orders (TDS)', href: '/construction/work-orders', icon: HardHat, color: 'text-amber-600 bg-amber-50' },
  { title: 'Site GRNs', desc: 'Site goods receipt & inventory', href: '/construction/site-grns', icon: Truck, color: 'text-purple-600 bg-purple-50' },
];

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-emerald-100 text-emerald-700',
  awarded: 'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-700',
  certified: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  under_review: 'bg-orange-100 text-orange-700',
};

export default function ConstructionPage() {
  const { data: contracts } = useContracts();
  const { data: raBills } = useRaBills();
  const { data: workOrders } = useConstructionWorkOrders();

  const activeContracts = contracts?.filter((c) => ['active', 'awarded'].includes(c.status)) || [];
  const pendingBills = raBills?.filter((b) => ['submitted', 'under_review'].includes(b.status)) || [];
  const pendingWOs = workOrders?.filter((w) => w.status === 'draft') || [];

  const totalContractValue = (contracts || []).reduce(
    (sum, c) => sum + parseFloat(c.contractValue || '0'), 0
  );
  const totalBilled = (contracts || []).reduce(
    (sum, c) => sum + parseFloat(c.totalBilled || '0'), 0
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Construction</h1>
          <p className="text-sm text-muted-foreground">
            Contracts, RA Bills, subcontractor payments, site materials
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Active Contracts</div>
            <div className="text-2xl font-bold text-blue-600">{activeContracts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Contract Value</div>
            <div className="text-2xl font-bold">
              ₹{(totalContractValue / 100000).toFixed(1)}L
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Billed</div>
            <div className="text-2xl font-bold text-emerald-600">
              ₹{(totalBilled / 100000).toFixed(1)}L
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pending Actions</div>
            <div className="text-2xl font-bold text-amber-600">
              {pendingBills.length + pendingWOs.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-5">
                <div className={`inline-flex p-2.5 rounded-lg mb-3 ${mod.color}`}>
                  <mod.icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm">{mod.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{mod.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent RA Bills */}
      {raBills && raBills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent RA Bills</CardTitle>
              <Link href="/construction/ra-bills">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Bill No</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Net Payable</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {raBills.slice(0, 5).map((bill) => (
                    <tr key={bill.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-xs">{bill.billNumber}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{bill.billDate}</td>
                      <td className="px-4 py-2.5">
                        ₹{parseFloat(bill.currentBillAmount || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        ₹{parseFloat(bill.netPayable || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[bill.status] || 'bg-gray-100 text-gray-600'}`}>
                          {bill.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
