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
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useCustomers, useCreateSalesOrder } from '@/hooks/use-selling';

interface LineItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

interface NewSalesOrderForm {
  customerId: string;
  orderDate: string;
  deliveryDate: string;
  notes: string;
  lines: LineItem[];
}

function calcLineTotal(line: LineItem): number {
  const gross = line.quantity * line.unitPrice;
  const afterDiscount = gross - (gross * line.discount) / 100;
  const tax = (afterDiscount * line.taxRate) / 100;
  return afterDiscount + tax;
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const { data: customers } = useCustomers();
  const createOrder = useCreateSalesOrder();

  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewSalesOrderForm>({
    defaultValues: {
      customerId: '',
      orderDate: today,
      deliveryDate: '',
      notes: '',
      lines: [{ itemId: '', itemName: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const watchLines = watch('lines');

  const subtotal = watchLines.reduce((sum, line) => {
    return sum + line.quantity * line.unitPrice;
  }, 0);

  const totalDiscount = watchLines.reduce((sum, line) => {
    const gross = line.quantity * line.unitPrice;
    return sum + (gross * line.discount) / 100;
  }, 0);

  const totalTax = watchLines.reduce((sum, line) => {
    const gross = line.quantity * line.unitPrice;
    const afterDiscount = gross - (gross * line.discount) / 100;
    return sum + (afterDiscount * line.taxRate) / 100;
  }, 0);

  const grandTotal = subtotal - totalDiscount + totalTax;

  const onSubmit = async (formData: NewSalesOrderForm) => {
    if (!formData.customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (formData.lines.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    try {
      await createOrder.mutateAsync({
        customerId: formData.customerId,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate || undefined,
        notes: formData.notes || undefined,
        lines: formData.lines.map((line) => ({
          itemId: line.itemId,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          discount: Number(line.discount),
          taxRate: Number(line.taxRate),
          lineTotal: calcLineTotal(line),
        })),
        subtotal,
        discountAmount: totalDiscount,
        taxAmount: totalTax,
        totalAmount: grandTotal,
      });
      toast.success('Sales order created successfully');
      router.push('/selling/sales-orders');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create sales order';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/selling" className="hover:text-foreground">Selling</Link>
          <span>&rsaquo;</span>
          <Link href="/selling/sales-orders" className="hover:text-foreground">Sales Orders</Link>
          <span>&rsaquo;</span>
          <span>New</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Sales Order</h1>
            <p className="text-sm text-muted-foreground">Create a new customer order</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Order Header */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Customer <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch('customerId')}
                  onValueChange={(val) => setValue('customerId', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers && customers.length > 0 ? (
                      customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No customers available. <Link href="/selling/customers/new" className="text-primary underline">Create one</Link>
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Order Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  {...register('orderDate', { required: 'Order date is required' })}
                />
                {errors.orderDate && <p className="text-xs text-destructive">{errors.orderDate.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Delivery Date</Label>
                <Input type="date" {...register('deliveryDate')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Line Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => append({ itemId: '', itemName: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 })}
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground min-w-[180px]">Item</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground w-24">Qty</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground w-32">Unit Price</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground w-24">Discount %</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground w-24">Tax %</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground w-32">Line Total</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const line = watchLines[index];
                    const lineTotal = line ? calcLineTotal(line) : 0;

                    return (
                      <tr key={field.id} className="border-b">
                        <td className="px-4 py-2 text-muted-foreground text-xs">{index + 1}</td>
                        <td className="px-4 py-2">
                          <Input
                            placeholder="Item name or ID"
                            className="h-8 text-sm"
                            {...register(`lines.${index}.itemId` as const)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            className="h-8 text-sm text-right"
                            {...register(`lines.${index}.quantity` as const, { valueAsNumber: true, min: 1 })}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="h-8 text-sm text-right"
                            {...register(`lines.${index}.unitPrice` as const, { valueAsNumber: true, min: 0 })}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="h-8 text-sm text-right"
                            {...register(`lines.${index}.discount` as const, { valueAsNumber: true, min: 0, max: 100 })}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="h-8 text-sm text-right"
                            {...register(`lines.${index}.taxRate` as const, { valueAsNumber: true, min: 0, max: 100 })}
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-sm font-medium">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-4 py-2">
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
          <CardContent className="py-4">
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-mono text-red-600">-{formatCurrency(totalDiscount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono">{formatCurrency(totalTax)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span className="font-mono text-lg">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="Internal notes for this order..."
              {...register('notes')}
            />
          </CardContent>
        </Card>

        <Separator />

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/selling/sales-orders')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createOrder.isPending}>
            {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Sales Order
          </Button>
        </div>
      </form>
    </div>
  );
}
