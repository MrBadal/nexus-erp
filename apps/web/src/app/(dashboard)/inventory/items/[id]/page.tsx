'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useItem,
  useUpdateItem,
  useDeleteItem,
  useWarehouses,
} from '@/hooks/use-inventory';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const itemTypeOptions = [
  { value: 'stock', label: 'Stock' },
  { value: 'service', label: 'Service' },
  { value: 'consumable', label: 'Consumable' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const itemId = params.id;

  const { data: item, isLoading, error } = useItem(itemId);
  const updateMutation = useUpdateItem();
  const deleteMutation = useDeleteItem();
  const { data: warehousesData } = useWarehouses();
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];

  // Local editable state (null = not yet changed by user)
  const [localName, setLocalName] = useState<string | null>(null);
  const [localCategory, setLocalCategory] = useState<string | null>(null);
  const [localItemType, setLocalItemType] = useState<string | null>(null);
  const [localUnit, setLocalUnit] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [localSellingPrice, setLocalSellingPrice] = useState<string | null>(null);
  const [localPurchasePrice, setLocalPurchasePrice] = useState<string | null>(null);
  const [localTaxRate, setLocalTaxRate] = useState<string | null>(null);
  const [localReorderLevel, setLocalReorderLevel] = useState<string | null>(null);
  const [localMaxStock, setLocalMaxStock] = useState<string | null>(null);
  const [localWarehouseId, setLocalWarehouseId] = useState<string | null>(null);

  // Derived current values
  const currentName = localName ?? item?.name ?? '';
  const currentCategory = localCategory ?? item?.category ?? '';
  const currentItemType = localItemType ?? item?.itemType ?? 'stock';
  const currentUnit = localUnit ?? item?.unit ?? '';
  const currentDescription = localDescription ?? item?.description ?? '';
  const currentSellingPrice = localSellingPrice ?? String(item?.sellingPrice ?? '');
  const currentPurchasePrice = localPurchasePrice ?? String(item?.purchasePrice ?? '');
  const currentTaxRate = localTaxRate ?? String(item?.taxRate ?? '');
  const currentReorderLevel = localReorderLevel ?? String(item?.minStockLevel ?? '');
  const currentMaxStock = localMaxStock ?? String(item?.reorderQuantity ?? '');

  const isActive = item?.status === 'active';

  // Handlers
  function handleSave() {
    if (!item) return;
    updateMutation.mutate(
      {
        id: itemId,
        data: {
          name: currentName,
          category: currentCategory,
          itemType: currentItemType,
          unit: currentUnit,
          description: currentDescription || null,
          sellingPrice: parseFloat(currentSellingPrice) || 0,
          purchasePrice: parseFloat(currentPurchasePrice) || 0,
          taxRate: parseFloat(currentTaxRate) || 0,
          minStockLevel: parseFloat(currentReorderLevel) || 0,
          reorderQuantity: parseFloat(currentMaxStock) || 0,
          ...(localWarehouseId ? { warehouseId: localWarehouseId } : {}),
        },
      },
      {
        onSuccess: () => toast.success('Item saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save item')),
      },
    );
  }

  function handleToggleStatus() {
    if (!item) return;
    const newStatus = isActive ? 'inactive' : 'active';
    updateMutation.mutate(
      { id: itemId, data: { status: newStatus } },
      {
        onSuccess: () =>
          toast.success(`Item ${newStatus === 'active' ? 'activated' : 'deactivated'}`),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to update item status')),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(itemId, {
      onSuccess: () => {
        toast.success('Item deleted');
        router.push('/inventory/items');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete item')),
    });
  }

  // ---------- Loading / Error states ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading item' : 'Item not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/inventory/items')}
          >
            Back to items
          </button>
        </div>
      </div>
    );
  }

  // ---------- Meta sidebar ----------

  const meta = [
    { label: 'Item Code', value: <span className="font-mono">{item.code}</span> },
    { label: 'Status', value: item.status === 'active' ? 'Active' : 'Inactive' },
    { label: 'Type', value: itemTypeOptions.find((o) => o.value === item.itemType)?.label ?? item.itemType },
    { label: 'Stock Qty', value: item.itemType === 'service' ? '—' : item.stockQty.toLocaleString() },
    { label: 'Selling Price', value: formatCurrency(item.sellingPrice) },
    { label: 'Purchase Price', value: formatCurrency(item.purchasePrice) },
    { label: 'Created', value: formatDate(item.createdAt) },
    { label: 'Last Updated', value: formatDate(item.updatedAt) },
  ];

  // ---------- Render ----------

  return (
    <FormPage
      title={item.name}
      subtitle={item.code}
      breadcrumbs={[
        { label: 'Inventory', href: '/inventory' },
        { label: 'Items', href: '/inventory/items' },
        { label: item.name },
      ]}
      backHref="/inventory/items"
      status={{
        label: isActive ? 'Active' : 'Inactive',
        variant: isActive ? 'success' : 'muted',
      }}
      primaryAction={{
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      secondaryActions={[
        {
          label: isActive ? 'Deactivate' : 'Activate',
          onClick: handleToggleStatus,
          variant: 'outline',
        },
      ]}
      dangerAction={{ label: 'Delete', onClick: handleDelete }}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <FormSection title="Basic Information" columns={2}>
          <FormField label="Item Code">
            <Input value={item.code} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Name" required>
            <Input
              value={currentName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Item name"
            />
          </FormField>
          <FormField label="Category" required>
            <Input
              value={currentCategory}
              onChange={(e) => setLocalCategory(e.target.value)}
              placeholder="e.g. Electronics, Raw Materials"
            />
          </FormField>
          <FormField label="Item Type" required>
            <Select value={currentItemType} onValueChange={(v) => setLocalItemType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Unit of Measure" required>
            <Input
              value={currentUnit}
              onChange={(e) => setLocalUnit(e.target.value)}
              placeholder="e.g. Each, Meter, Kg"
            />
          </FormField>
          <div /> {/* spacer */}
          <FormField label="Description" className="md:col-span-2">
            <Textarea
              value={currentDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Item description"
              rows={3}
            />
          </FormField>
        </FormSection>

        {/* Pricing */}
        <FormSection title="Pricing" columns={3}>
          <FormField label="Selling Price">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={currentSellingPrice}
              onChange={(e) => setLocalSellingPrice(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Purchase Price">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={currentPurchasePrice}
              onChange={(e) => setLocalPurchasePrice(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Tax Rate (%)">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={currentTaxRate}
              onChange={(e) => setLocalTaxRate(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
        </FormSection>

        {/* Inventory */}
        <FormSection title="Inventory" columns={2}>
          <FormField label="Current Stock Qty">
            <Input
              value={item.itemType === 'service' ? 'N/A (service item)' : item.stockQty.toLocaleString()}
              readOnly
              className="bg-muted"
            />
          </FormField>
          <FormField label="Default Warehouse">
            <Select
              value={localWarehouseId ?? ''}
              onValueChange={(v) => setLocalWarehouseId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Reorder Level (Min Stock)">
            <Input
              type="number"
              min="0"
              value={currentReorderLevel}
              onChange={(e) => setLocalReorderLevel(e.target.value)}
              placeholder="0"
              disabled={item.itemType === 'service'}
            />
          </FormField>
          <FormField label="Reorder Quantity (Max Stock)">
            <Input
              type="number"
              min="0"
              value={currentMaxStock}
              onChange={(e) => setLocalMaxStock(e.target.value)}
              placeholder="0"
              disabled={item.itemType === 'service'}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
