'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Package, Warehouse, ArrowRightLeft, TrendingUp, AlertTriangle, ArrowRight, Plus, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useItems, useWarehouses, useStockMovements, useGenerateReorderPOs } from '@/hooks/use-inventory';

export default function InventoryDashboardPage() {
  const { data: itemsData, isLoading: itemsLoading } = useItems({ limit: 100 });
  const { data: warehousesData } = useWarehouses();
  const { data: movementsData } = useStockMovements({ limit: 5 });
  const generateReorderPOs = useGenerateReorderPOs();
  const [reorderResult, setReorderResult] = useState<{ purchaseOrdersCreated: number; skippedNoSupplier: string[] } | null>(null);

  const items = itemsData ?? [];
  const warehouses = warehousesData ?? [];
  const movements = movementsData ?? [];

  const totalItems = items.length;
  const warehouseCount = warehouses.length;
  const stockValue = items.reduce((sum, i) => sum + (i.sellingPrice ?? 0) * (i.stockQty ?? 0), 0);
  const lowStockCount = items.filter((i) => i.itemType === 'stock' && i.stockQty < (i.minStockLevel ?? 50)).length;

  const lowStockItems = items
    .filter((i) => i.itemType === 'stock' && i.stockQty < (i.minStockLevel ?? 50))
    .slice(0, 5);

  const kpis = [
    { label: 'Total Items', value: totalItems.toLocaleString(), icon: Package },
    { label: 'Warehouses', value: String(warehouseCount), icon: Warehouse },
    { label: 'Stock Value', value: formatCurrency(stockValue), icon: TrendingUp },
    { label: 'Low Stock Alerts', value: String(lowStockCount), icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Overview</h1>
          <p className="text-sm text-muted-foreground">Manage your stock, warehouses, and inventory movements.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={generateReorderPOs.isPending}
            onClick={() => {
              generateReorderPOs.mutate(undefined, {
                onSuccess: (result) => setReorderResult(result),
              });
            }}
          >
            {generateReorderPOs.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Check Reorder Levels
          </Button>
          <Link href="/inventory/items"><Button variant="outline" size="sm" className="gap-1.5"><Package className="h-3.5 w-3.5" /> View Items</Button></Link>
          <Link href="/inventory/items/new"><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Item</Button></Link>
        </div>
      </div>

      {itemsLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory data...
        </div>
      )}

      {reorderResult && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">Reorder Check Complete:</span>{' '}
                {reorderResult.purchaseOrdersCreated > 0
                  ? `${reorderResult.purchaseOrdersCreated} draft Purchase Order(s) created.`
                  : 'No items need reordering.'}
                {reorderResult.skippedNoSupplier.length > 0 && (
                  <span className="text-amber-700 ml-2">
                    ({reorderResult.skippedNoSupplier.length} items skipped — no default supplier)
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setReorderResult(null)}>Dismiss</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Stock Movements</CardTitle>
            <Link href="/inventory/stock-movements">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No stock movements yet.</p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-[1fr_80px_60px_100px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                  <span>Item</span><span>Type</span><span className="text-right">Qty</span><span className="text-right">Warehouse</span>
                </div>
                {movements.slice(0, 5).map((m) => (
                  <div key={m.id} className="grid grid-cols-[1fr_80px_60px_100px] gap-2 border-b py-2.5 text-sm last:border-0">
                    <span className="truncate font-medium">{m.item}</span>
                    <Badge variant={m.type === 'receipt' ? 'default' : m.type === 'issue' ? 'destructive' : 'secondary'} className="text-[10px] w-fit">
                      {m.type}
                    </Badge>
                    <span className={`text-right font-mono text-xs ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                    <span className="text-right text-xs text-muted-foreground truncate">{m.warehouse}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Low Stock Alerts</CardTitle>
              <Badge variant="destructive" className="text-[10px]">{lowStockCount}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All stock levels are healthy.</p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-[1fr_80px_80px_60px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                  <span>Item</span><span className="text-right">Current</span><span className="text-right">Minimum</span><span className="text-right">Unit</span>
                </div>
                {lowStockItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_80px_80px_60px] gap-2 border-b py-2.5 text-sm last:border-0">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{item.code}</span>
                    </div>
                    <span className="text-right font-mono text-xs text-red-600">{item.stockQty}</span>
                    <span className="text-right font-mono text-xs text-muted-foreground">{item.minStockLevel}</span>
                    <span className="text-right text-xs text-muted-foreground">{item.unit}</span>
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
