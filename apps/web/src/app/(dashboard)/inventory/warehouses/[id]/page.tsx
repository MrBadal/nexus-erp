'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
} from '@/hooks/use-inventory';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const warehouseTypeOptions = [
  { value: 'main', label: 'Main' },
  { value: 'transit', label: 'Transit' },
  { value: 'virtual', label: 'Virtual' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WarehouseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const warehouseId = params.id;

  const { data: warehouse, isLoading, error } = useWarehouse(warehouseId);
  const updateMutation = useUpdateWarehouse();
  const deleteMutation = useDeleteWarehouse();

  // Local editable state (null = not yet changed by user)
  const [localName, setLocalName] = useState<string | null>(null);
  const [localType, setLocalType] = useState<string | null>(null);
  const [localAddress, setLocalAddress] = useState<string | null>(null);
  const [localCity, setLocalCity] = useState<string | null>(null);
  const [localState, setLocalState] = useState<string | null>(null);
  const [localCountry, setLocalCountry] = useState<string | null>(null);
  const [localCapacity, setLocalCapacity] = useState<string | null>(null);

  // Derived current values
  const currentName = localName ?? warehouse?.name ?? '';
  const currentType = localType ?? 'main';
  const currentAddress = localAddress ?? warehouse?.address ?? '';
  const currentCity = localCity ?? warehouse?.city ?? '';
  const currentState = localState ?? warehouse?.state ?? '';
  const currentCountry = localCountry ?? warehouse?.country ?? '';
  const currentCapacity = localCapacity ?? '';

  const isActive = warehouse?.isActive ?? true;

  // Handlers
  function handleSave() {
    if (!warehouse) return;
    updateMutation.mutate(
      {
        id: warehouseId,
        data: {
          name: currentName,
          type: currentType,
          address: currentAddress,
          city: currentCity,
          state: currentState,
          country: currentCountry,
          ...(currentCapacity ? { capacity: parseFloat(currentCapacity) } : {}),
        },
      },
      {
        onSuccess: () => toast.success('Warehouse saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save warehouse')),
      },
    );
  }

  function handleToggleStatus() {
    if (!warehouse) return;
    const newIsActive = !isActive;
    updateMutation.mutate(
      { id: warehouseId, data: { isActive: newIsActive } },
      {
        onSuccess: () =>
          toast.success(`Warehouse ${newIsActive ? 'activated' : 'deactivated'}`),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to update warehouse status')),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(warehouseId, {
      onSuccess: () => {
        toast.success('Warehouse deleted');
        router.push('/inventory/warehouses');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete warehouse')),
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

  if (error || !warehouse) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading warehouse' : 'Warehouse not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/inventory/warehouses')}
          >
            Back to warehouses
          </button>
        </div>
      </div>
    );
  }

  // ---------- Meta sidebar ----------

  const meta = [
    { label: 'Code', value: <span className="font-mono">{warehouse.code}</span> },
    { label: 'Status', value: isActive ? 'Active' : 'Inactive' },
    { label: 'Default', value: warehouse.isDefault ? 'Yes' : 'No' },
    { label: 'Item Count', value: warehouse.itemCount.toLocaleString() },
    {
      label: 'Total Value',
      value: `$${(warehouse.totalValue / 1000).toFixed(1)}K`,
    },
    { label: 'Created', value: formatDate(warehouse.createdAt) },
    { label: 'Last Updated', value: formatDate(warehouse.updatedAt) },
  ];

  // ---------- Render ----------

  return (
    <FormPage
      title={warehouse.name}
      subtitle={warehouse.code}
      breadcrumbs={[
        { label: 'Inventory', href: '/inventory' },
        { label: 'Warehouses', href: '/inventory/warehouses' },
        { label: warehouse.name },
      ]}
      backHref="/inventory/warehouses"
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
          <FormField label="Code">
            <Input value={warehouse.code} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Name" required>
            <Input
              value={currentName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Warehouse name"
            />
          </FormField>
          <FormField label="Type">
            <Select value={currentType} onValueChange={(v) => setLocalType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {warehouseTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Capacity (units)">
            <Input
              type="number"
              min="0"
              value={currentCapacity}
              onChange={(e) => setLocalCapacity(e.target.value)}
              placeholder="Maximum capacity"
            />
          </FormField>
        </FormSection>

        {/* Location */}
        <FormSection title="Location" columns={2}>
          <FormField label="Address" className="md:col-span-2">
            <Input
              value={currentAddress}
              onChange={(e) => setLocalAddress(e.target.value)}
              placeholder="Street address"
            />
          </FormField>
          <FormField label="City">
            <Input
              value={currentCity}
              onChange={(e) => setLocalCity(e.target.value)}
              placeholder="City"
            />
          </FormField>
          <FormField label="State / Province">
            <Input
              value={currentState}
              onChange={(e) => setLocalState(e.target.value)}
              placeholder="State"
            />
          </FormField>
          <FormField label="Country">
            <Input
              value={currentCountry}
              onChange={(e) => setLocalCountry(e.target.value)}
              placeholder="Country"
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
