'use client';

import Link from 'next/link';
import { Package, Wrench, FolderOpen, ArrowRight, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useAssets } from '@/hooks/use-assets';

interface AssetItem {
  id: string;
  assetNumber?: string;
  name?: string;
  category?: string;
  status?: string;
  currentValue?: number;
  location?: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-yellow-100 text-yellow-700',
  in_use: 'bg-green-100 text-green-700',
  maintenance: 'bg-orange-100 text-orange-700',
  disposed: 'bg-red-100 text-red-700',
  scrapped: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_use: 'In Use',
  maintenance: 'Maintenance',
  disposed: 'Disposed',
  scrapped: 'Scrapped',
};

export default function AssetsPage() {
  const { data, isLoading } = useAssets({ limit: 7 });
  const assets = (data ?? []) as AssetItem[];

  const totalAssets = assets.length;
  const totalValue = assets.reduce((sum, a) => sum + (a.currentValue ?? 0), 0);
  const inUse = assets.filter((a) => a.status === 'in_use').length;
  const underMaintenance = assets.filter((a) => a.status === 'maintenance').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-sm text-muted-foreground">Fixed asset management and depreciation tracking</p>
        </div>
        <div className="flex gap-2">
          <Link href="/assets/list">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Package className="h-3.5 w-3.5" /> Asset Register
            </Button>
          </Link>
          <Link href="/assets/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Asset
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading asset data...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalAssets}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalValue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Use</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{inUse}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Under Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{underMaintenance}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/assets/list" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Asset Register</div>
                <div className="text-sm text-muted-foreground">View and manage all fixed assets</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/assets/categories" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <FolderOpen className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Asset Categories</div>
                <div className="text-sm text-muted-foreground">Define categories with depreciation policies</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/assets/maintenance" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Maintenance Schedule</div>
                <div className="text-sm text-muted-foreground">Track maintenance activities and costs</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Assets</CardTitle>
          <Link href="/assets/list">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
          </Link>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No assets yet.</p>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-[1fr_100px_100px_80px_100px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                <span>Asset</span><span>Category</span><span>Location</span><span>Status</span><span className="text-right">Value</span>
              </div>
              {assets.slice(0, 7).map((asset) => (
                <div key={asset.id} className="grid grid-cols-[1fr_100px_100px_80px_100px] gap-2 border-b py-2.5 text-sm last:border-0">
                  <div>
                    <span className="font-medium">{asset.name || '\u2014'}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{asset.assetNumber || ''}</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{asset.category || '\u2014'}</span>
                  <span className="text-xs text-muted-foreground truncate">{asset.location || '\u2014'}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${statusColors[asset.status || 'draft']}`}>
                    {statusLabels[asset.status || 'draft'] || asset.status}
                  </span>
                  <span className="text-right font-mono text-xs font-medium">{formatCurrency(asset.currentValue ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
