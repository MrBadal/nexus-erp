'use client';

import Link from 'next/link';
import { ClipboardCheck, ShieldCheck, AlertTriangle, Clock, ArrowRight, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQualityInspections, useNcrs } from '@/hooks/use-quality';

interface InspectionItem {
  id: string;
  inspectionNumber?: string;
  number?: string;
  itemName?: string;
  item?: string;
  referenceType?: string;
  type?: string;
  inspectionDate?: string;
  date?: string;
  status?: string;
  sampleSize?: number;
}

interface NcrItem {
  id: string;
  ncrNumber?: string;
  number?: string;
  title?: string;
  severity?: string;
  status?: string;
  dueDate?: string;
}

const inspectionStatusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  on_hold: 'bg-amber-100 text-amber-700',
};

const severityColors: Record<string, string> = {
  minor: 'bg-yellow-100 text-yellow-700',
  major: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const ncrStatusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  investigation: 'bg-amber-100 text-amber-700',
  corrective_action: 'bg-purple-100 text-purple-700',
  closed: 'bg-green-100 text-green-700',
  void: 'bg-gray-100 text-gray-700',
};

export default function QualityDashboardPage() {
  const { data: inspData, isLoading: inspLoading } = useQualityInspections({ limit: 5 });
  const { data: ncrData, isLoading: ncrLoading } = useNcrs({ limit: 4 });

  const inspections = (inspData ?? []) as InspectionItem[];
  const ncrs = (ncrData ?? []) as NcrItem[];

  const totalInspections = inspections.length;
  const acceptedCount = inspections.filter((i) => i.status === 'accepted').length;
  const openNcrCount = ncrs.filter((n) => n.status !== 'closed' && n.status !== 'void').length;
  const pendingCount = inspections.filter((i) => i.status === 'in_progress' || i.status === 'draft').length;

  const kpis = [
    { label: 'Inspections', value: totalInspections, icon: ClipboardCheck, color: 'text-blue-600' },
    { label: 'Accepted', value: acceptedCount, icon: ShieldCheck, color: 'text-green-600' },
    { label: 'Open NCRs', value: openNcrCount, icon: AlertTriangle, color: 'text-amber-600' },
    { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quality</h1>
          <p className="text-sm text-muted-foreground">Quality control overview and recent activity</p>
        </div>
        <div className="flex gap-2">
          <Link href="/quality/inspections">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" /> Inspections
            </Button>
          </Link>
          <Link href="/quality/inspections/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Inspection
            </Button>
          </Link>
        </div>
      </div>

      {(inspLoading || ncrLoading) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading quality data...
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
            <CardTitle className="text-base">Recent Inspections</CardTitle>
            <Link href="/quality/inspections">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {inspections.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No inspections yet.</p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-[1fr_1fr_80px_60px_80px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                  <span>Inspection #</span><span>Item</span><span>Type</span><span className="text-right">Sample</span><span>Status</span>
                </div>
                {inspections.slice(0, 5).map((insp) => (
                  <div key={insp.id} className="grid grid-cols-[1fr_1fr_80px_60px_80px] gap-2 border-b py-2.5 text-sm last:border-0">
                    <span className="font-mono text-xs">{insp.inspectionNumber || insp.number || '\u2014'}</span>
                    <span className="truncate">{insp.itemName || insp.item || '\u2014'}</span>
                    <span className="text-xs text-muted-foreground">{(insp.referenceType || insp.type || 'incoming').replace('_', ' ')}</span>
                    <span className="text-right font-mono text-xs">{insp.sampleSize ?? 0}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${inspectionStatusColors[insp.status || 'draft']}`}>
                      {(insp.status || 'draft').replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Open NCRs</CardTitle>
              <Badge variant="destructive" className="text-[10px]">{openNcrCount}</Badge>
            </div>
            <Link href="/quality/ncr">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ncrs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No NCRs yet.</p>
            ) : (
              <div className="space-y-3">
                {ncrs.filter((n) => n.status !== 'closed' && n.status !== 'void').slice(0, 4).map((ncr) => (
                  <div key={ncr.id} className="border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">{ncr.ncrNumber || ncr.number || '\u2014'}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${severityColors[ncr.severity || 'minor']}`}>
                        {ncr.severity || 'minor'}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{ncr.title || '\u2014'}</p>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${ncrStatusColors[ncr.status || 'open']}`}>
                        {(ncr.status || 'open').replace('_', ' ')}
                      </span>
                      {ncr.dueDate && <span className="text-xs text-muted-foreground">Due: {ncr.dueDate}</span>}
                    </div>
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
