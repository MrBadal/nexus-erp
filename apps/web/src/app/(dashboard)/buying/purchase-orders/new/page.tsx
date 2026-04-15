'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePurchaseOrder, useSuppliers } from '@/hooks/use-buying';
import { formatCurrency } from '@/lib/utils';

interface LineItem {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

interface PurchaseOrderFormData {
  supplierId: string;
  orderDate: string;
  expectedDelivery: string;
  notes: string;
  lines: LineItem[];
}

function calcLineTotal(line: LineItem): number {
  const subtotal = line.quantity * line.unitPrice;
  const discounted = subtotal - (subtotal * line.discount) / 100;
  const tax = (discounted * line.taxRate) / 100;
  return discounted + tax;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const createPO = useCreatePurchaseOrder();
  const { data: suppliers } = useSuppliers();

  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseOrderFormData>({
    defaultValues: {
      supplierId: '',
      orderDate: today,
      expectedDelivery: '',
      notes: '',
      lines: [
        { itemId: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const watchedLines = watch('lines');

  const subtotal = watchedLines.reduce((sum, line) => {
    return sum + line.quantity * line.unitPrice;
  }, 0);

  const totalDiscount = watchedLines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unitPrice;
    return sum + (lineSubtotal * line.discount) / 100;
  }, 0);

  const totalTax = watchedLines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unitPrice;
    const discounted = lineSubtotal - (lineSubtotal * line.discount) / 100;
    return sum + (discounted * line.taxRate) / 100;
  }, 0);

  const grandTotal = subtotal - totalDiscount + totalTax;

  const onSubmit = async (data: PurchaseOrderFormData) => {
    if (!data.supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (data.lines.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    try {
      await createPO.mutateAsync({
        supplierId: data.supplierId,
        orderDate: data.orderDate,
        expectedDelivery: data.expectedDelivery || null,
        notes: data.notes || null,
        lines: data.lines.map((line, idx) => ({
          lineNumber: idx + 1,
          itemId: line.itemId || null,
          description: line.description || null,
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          discount: String(line.discount),
          taxRate: String(line.taxRate),
          taxAmount: String(
            ((line.quantity * line.unitPrice - (line.quantity * line.unitPrice * line.discount) / 100) * line.taxRate) / 100
          ),
          lineTotal: String(calcLineTotal(line)),
        })),
      });
      toast.success('Purchase order created successfully');
      router.push('/buying/purchase-orders');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create purchase order';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/buying" className="hover:text-foreground">Buying</Link>
          <span>&rsaquo;</span>
          <Link href="/buying/purchase-orders" className="hover:text-foreground">Purchase Orders</Link>
          <span>&rsaquo;</span>
          <span>New</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Purchase Order</h1>
            <p className="text-sm text-muted-foreground">Create a new procurement order</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select onValueChange={(value) => setValue('supplierId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers && suppliers.length > 0 ? (
                    suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No suppliers available
                    </div>
                  )}
                </SelectContent>
              </Select>
              {errors.supplierId && <p className="text-xs text-destructive">{errors.supplierId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderDate">Order Date *</Label>
              <Input
                id="orderDate"
                type="date"
                {...register('orderDate', { required: 'Order date is required' })}
              />
              {errors.orderDate && <p className="text-xs text-destructive">{errors.orderDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Expected Delivery</Label>
              <Input
                id="expectedDelivery"
                type="date"
                {...register('expectedDelivery')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Line Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  append({ itemId: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item / Description</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-28">Unit Price</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">Disc %</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">Tax %</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-28">Total</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const lineTotal = calcLineTotal(watchedLines[index] || { quantity: 0, unitPrice: 0, discount: 0, taxRate: 0, itemId: '', description: '' });
                    return (
                      <tr key={field.id} className="border-b">
                        <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="Description"
                            className="h-8 text-sm"
                            {...register(`lines.${index}.description`)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className="h-8 text-sm text-right"
                            {...register(`lines.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className="h-8 text-sm text-right"
                            {...register(`lines.${index}.unitPrice`, { valueAsNumber: true, min: 0 })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            className="h-8 text-sm text-right"
                            {...register(`lines.${index}.discount`, { valueAsNumber: true, min: 0, max: 100 })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            className="h-8 text-sm text-right"
                            {...register(`lines.${index}.taxRate`, { valueAsNumber: true, min: 0, max: 100 })}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm font-medium">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-3 py-2">
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-mono text-red-600">-{formatCurrency(totalDiscount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono">+{formatCurrency(totalTax)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
              placeholder="Additional notes or instructions..."
              {...register('notes')}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || createPO.isPending}>
            {(isSubmitting || createPO.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Purchase Order
          </Button>
        </div>
      </form>
    </div>
  );
}
