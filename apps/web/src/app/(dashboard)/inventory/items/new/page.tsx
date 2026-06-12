'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
import { useCreateItem } from '@/hooks/use-inventory';

interface NewItemFormData {
  name: string;
  code: string;
  category: string;
  itemType: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  taxRate: number;
  minStockLevel: number;
  reorderQuantity: number;
  description: string;
}

function generateCode(name: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  const prefix = words
    .map((w) => w.substring(0, 3).toUpperCase())
    .slice(0, 2)
    .join('-');
  const num = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${num}`;
}

export default function NewItemPage() {
  const router = useRouter();
  const createItem = useCreateItem();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewItemFormData>({
    defaultValues: {
      name: '',
      code: '',
      category: '',
      itemType: 'stock',
      unit: 'Each',
      purchasePrice: 0,
      sellingPrice: 0,
      taxRate: 0,
      minStockLevel: 0,
      reorderQuantity: 0,
      description: '',
    },
  });

  const nameValue = watch('name');

  const onSubmit = async (data: NewItemFormData) => {
    try {
      await createItem.mutateAsync({
        name: data.name,
        code: data.code,
        category: data.category,
        itemType: data.itemType,
        unit: data.unit,
        purchasePrice: Number(data.purchasePrice),
        sellingPrice: Number(data.sellingPrice),
        taxRate: Number(data.taxRate),
        minStockLevel: Number(data.minStockLevel),
        reorderQuantity: Number(data.reorderQuantity),
        description: data.description || null,
      });
      toast.success('Item created successfully');
      router.push('/inventory/items');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create item';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-4">
        <Link href="/inventory/items">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/inventory" className="hover:text-foreground">Inventory</Link>
            <span>›</span>
            <Link href="/inventory/items" className="hover:text-foreground">Items</Link>
            <span>›</span>
            <span>New</span>
          </div>
          <h1 className="text-2xl font-bold">New Item</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Widget A-100"
                {...register('name', { required: 'Item name is required' })}
                onBlur={(e) => {
                  if (e.target.value && !watch('code')) {
                    setValue('code', generateCode(e.target.value));
                  }
                }}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Item Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="e.g. WDG-A100"
                  className="font-mono"
                  {...register('code', { required: 'Item code is required' })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue('code', generateCode(nameValue))}
                >
                  Auto
                </Button>
              </div>
              {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                placeholder="e.g. Electronics, Raw Materials"
                {...register('category', { required: 'Category is required' })}
              />
              {errors.category && <p className="text-xs text-red-600">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemType">Item Type *</Label>
              <Select
                defaultValue="stock"
                onValueChange={(val) => setValue('itemType', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock (Product)</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="consumable">Consumable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit of Measure *</Label>
              <Select
                defaultValue="Each"
                onValueChange={(val) => setValue('unit', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Each">Each</SelectItem>
                  <SelectItem value="Kg">Kilogram (Kg)</SelectItem>
                  <SelectItem value="Liter">Liter</SelectItem>
                  <SelectItem value="Meter">Meter</SelectItem>
                  <SelectItem value="Box">Box</SelectItem>
                  <SelectItem value="Pack">Pack</SelectItem>
                  <SelectItem value="Sheet">Sheet</SelectItem>
                  <SelectItem value="Hour">Hour</SelectItem>
                  <SelectItem value="Set">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this item..."
                rows={3}
                {...register('description')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('purchasePrice', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('sellingPrice', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                {...register('taxRate', { valueAsNumber: true })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minStockLevel">Minimum Stock Level</Label>
              <Input
                id="minStockLevel"
                type="number"
                min="0"
                placeholder="0"
                {...register('minStockLevel', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Alert when stock falls below this level</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
              <Input
                id="reorderQuantity"
                type="number"
                min="0"
                placeholder="0"
                {...register('reorderQuantity', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Suggested quantity when reordering</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/inventory/items">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createItem.isPending}>
            {createItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Item
          </Button>
        </div>
      </form>
    </div>
  );
}
