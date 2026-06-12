'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, SendHorizonal } from 'lucide-react';
import Link from 'next/link';
import { get, post, endpoints } from '@/lib/api';
import { useWarehouses } from '@/hooks/use-inventory';

interface StockLevel {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  warehouseId: string;
  quantity: string;
}

interface ReconciliationLine {
  itemId: string;
  itemName: string;
  itemCode: string;
  systemQty: number;
  physicalQty: string;
  difference: number;
  reason: string;
}

export default function NewReconciliationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [warehouseId, setWarehouseId] = useState('');
  const [reason, setReason] = useState('Stock Reconciliation');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<ReconciliationLine[]>([]);

  const { data: warehousesData } = useWarehouses();
  const warehouses = warehousesData ?? [];

  // Fetch stock levels when warehouse selected
  const { data: stockLevels, isLoading: loadingStock } = useQuery({
    queryKey: ['stock-levels', warehouseId],
    queryFn: () =>
      get<StockLevel[]>(`${endpoints.stockMovements.list.replace('stock-movements', 'stock-levels')}?warehouseId=${warehouseId}&limit=500`),
    enabled: !!warehouseId,
  });

  // Populate lines when stock levels load
  useEffect(() => {
    if (stockLevels && stockLevels.length > 0) {
      setLines(
        stockLevels.map((sl) => ({
          itemId: sl.itemId,
          itemName: sl.itemName,
          itemCode: sl.itemCode,
          systemQty: parseFloat(sl.quantity),
          physicalQty: sl.quantity,
          difference: 0,
          reason: '',
        })),
      );
    } else if (stockLevels) {
      setLines([]);
    }
  }, [stockLevels]);

  const updateLine = (index: number, physicalQty: string, lineReason?: string) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const physical = parseFloat(physicalQty) || 0;
        return {
          ...line,
          physicalQty,
          difference: physical - line.systemQty,
          reason: lineReason !== undefined ? lineReason : line.reason,
        };
      }),
    );
  };

  const createAdjustment = useMutation({
    mutationFn: async (submitAfterCreate: boolean) => {
      const adjustmentLines = lines
        .filter((l) => l.difference !== 0)
        .map((l) => ({
          itemId: l.itemId,
          currentQty: l.systemQty.toFixed(4),
          adjustedQty: (parseFloat(l.physicalQty) || 0).toFixed(4),
          reason: l.reason || 'Stock reconciliation count',
        }));

      if (adjustmentLines.length === 0) {
        throw new Error('No differences found — all physical counts match system quantities.');
      }

      const result = await post<{ id: string }>(endpoints.stockMovements.adjust, {
        warehouseId,
        reason,
        notes,
        lines: adjustmentLines,
      });

      if (submitAfterCreate && result.id) {
        await post(endpoints.stockMovements.submitAdjustment(result.id));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      router.push('/inventory/reconciliation');
    },
  });

  const changedLines = lines.filter((l) => l.difference !== 0);
  const totalPositive = changedLines.filter((l) => l.difference > 0).reduce((s, l) => s + l.difference, 0);
  const totalNegative = changedLines.filter((l) => l.difference < 0).reduce((s, l) => s + l.difference, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory/reconciliation">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Stock Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            Select a warehouse, enter physical counts, and submit differences as a stock adjustment.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Reconciliation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Items</span>
              <span className="font-medium">{lines.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items with Differences</span>
              <span className="font-medium">{changedLines.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Surplus</span>
              <span className="font-medium text-emerald-600">+{totalPositive.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Shortage</span>
              <span className="font-medium text-red-600">{totalNegative.toFixed(2)}</span>
            </div>
            <hr />
            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={() => createAdjustment.mutate(false)}
                disabled={createAdjustment.isPending || changedLines.length === 0}
                variant="outline"
                className="gap-1.5"
              >
                {createAdjustment.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save as Draft
              </Button>
              <Button
                onClick={() => createAdjustment.mutate(true)}
                disabled={createAdjustment.isPending || changedLines.length === 0}
                className="gap-1.5"
              >
                {createAdjustment.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SendHorizonal className="h-3.5 w-3.5" />
                )}
                Save & Submit for Approval
              </Button>
            </div>
            {createAdjustment.isError && (
              <p className="text-sm text-red-600">
                {(createAdjustment.error as Error).message || 'Failed to create adjustment'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Count Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Physical Count {lines.length > 0 && `(${lines.length} items)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!warehouseId ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Select a warehouse to load stock items for reconciliation.
            </p>
          ) : loadingStock ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading stock levels...
            </div>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No stock items found in this warehouse.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="py-2 pr-4">Item Code</th>
                    <th className="py-2 pr-4">Item Name</th>
                    <th className="py-2 pr-4 text-right">System Qty</th>
                    <th className="py-2 pr-4 text-right w-32">Physical Qty</th>
                    <th className="py-2 pr-4 text-right">Difference</th>
                    <th className="py-2 w-48">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr
                      key={line.itemId}
                      className={`border-b last:border-0 ${line.difference !== 0 ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="py-2 pr-4 font-mono text-xs">{line.itemCode}</td>
                      <td className="py-2 pr-4 font-medium">{line.itemName}</td>
                      <td className="py-2 pr-4 text-right font-mono">{line.systemQty.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 w-28 text-right font-mono ml-auto"
                          value={line.physicalQty}
                          onChange={(e) => updateLine(index, e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <span
                          className={`font-mono ${
                            line.difference > 0
                              ? 'text-emerald-600'
                              : line.difference < 0
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {line.difference > 0 ? '+' : ''}
                          {line.difference.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2">
                        {line.difference !== 0 && (
                          <Input
                            className="h-8 text-xs"
                            placeholder="Reason for difference"
                            value={line.reason}
                            onChange={(e) => updateLine(index, line.physicalQty, e.target.value)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
