'use client';

import Link from 'next/link';
import { Factory, ClipboardList, Cog, CheckCircle, ArrowRight, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkOrders, useBoms } from '@/hooks/use-manufacturing';

interface WorkOrderItem {
  id: string;
  workOrderNumber?: string;
  number?: string;
  itemName?: string;
  item?: string;
  quantity?: number;
  completedQty?: number;
  completed?: number;
  status?: string;
  priority?: string;
}

interface BomItem {
  id: string;
  bomNumber?: string;
  number?: string;
  itemName?: string;
  item?: string;
  itemCount?: number;
  status?: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  not_started: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  stopped: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
};

export default function ManufacturingDashboardPage() {
  const { data: workOrdersData, isLoading: woLoading } = useWorkOrders({ limit: 7 });
  const { data: bomsData, isLoading: bomLoading } = useBoms({ limit: 5 });

  const workOrders = (workOrdersData ?? []) as WorkOrderItem[];
  const boms = (bomsData ?? []) as BomItem[];

  const activeBoms = boms.filter((b) => b.status === 'active').length;
  const openWo = workOrders.filter((wo) => wo.status !== 'completed' && wo.status !== 'cancelled').length;
  const inProgressWo = workOrders.filter((wo) => wo.status === 'in_progress').length;
  const completedWo = workOrders.filter((wo) => wo.status === 'completed').length;

  const kpis = [
    { label: 'Active BOMs', value: activeBoms, icon: ClipboardList, color: 'text-blue-600' },
    { label: 'Open Work Orders', value: openWo, icon: Factory, color: 'text-amber-600' },
    { label: 'In Progress', value: inProgressWo, icon: Cog, color: 'text-yellow-600' },
    { label: 'Completed', value: completedWo, icon: CheckCircle, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manufacturing</h1>
          <p className="text-sm text-muted-foreground">Production overview and recent activity</p>
        </div>
        <div className="flex gap-2">
          <Link href="/manufacturing/work-orders">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Factory className="h-3.5 w-3.5" /> Work Orders
            </Button>
          </Link>
          <Link href="/manufacturing/work-orders/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Work Order
            </Button>
          </Link>
        </div>
      </div>

      {(woLoading || bomLoading) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading manufacturing data...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Work Orders</CardTitle>
            <Link href="/manufacturing/work-orders">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {workOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No work orders yet.</p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-[1fr_1fr_100px_80px_80px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                  <span>Work Order #</span><span>Item</span><span>Progress</span><span>Priority</span><span>Status</span>
                </div>
                {workOrders.slice(0, 7).map((wo) => {
                  const qty = wo.quantity || 0;
                  const done = wo.completedQty ?? wo.completed ?? 0;
                  const pct = qty > 0 ? Math.round((done / qty) * 100) : 0;
                  return (
                    <div key={wo.id} className="grid grid-cols-[1fr_1fr_100px_80px_80px] gap-2 border-b py-2.5 text-sm last:border-0">
                      <span className="font-mono text-xs font-medium">{wo.workOrderNumber || wo.number || '\u2014'}</span>
                      <span className="truncate">{wo.itemName || wo.item || '\u2014'}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                      <Badge variant={wo.priority === 'urgent' || wo.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] w-fit">
                        {wo.priority || 'medium'}
                      </Badge>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${statusColors[wo.status || 'draft']}`}>
                        {(wo.status || 'draft').replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent BOMs</CardTitle>
            <Link href="/manufacturing/bom">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {boms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No BOMs yet.</p>
            ) : (
              <div className="space-y-3">
                {boms.slice(0, 5).map((bom) => (
                  <div key={bom.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{bom.itemName || bom.item || '\u2014'}</p>
                      <p className="text-xs text-muted-foreground">
                        {bom.bomNumber || bom.number || '\u2014'} &middot; {bom.itemCount ?? 0} items
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[bom.status || 'draft']}`}>
                      {bom.status || 'draft'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
