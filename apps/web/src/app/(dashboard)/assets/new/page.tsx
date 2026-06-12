'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateAsset, useAssetCategories } from '@/hooks/use-assets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryData {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const depreciationMethods = [
  { value: 'straight_line', label: 'Straight Line' },
  { value: 'declining_balance', label: 'Declining Balance' },
  { value: 'double_declining', label: 'Double Declining' },
  { value: 'units_of_production', label: 'Units of Production' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewAssetPage() {
  const router = useRouter();
  const createMutation = useCreateAsset();
  const { data: categoriesData } = useAssetCategories();
  const categories: CategoryData[] = (categoriesData as CategoryData[] | undefined) ?? [];

  // Form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [purchasePrice, setPurchasePrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [depreciationMethod, setDepreciationMethod] = useState('straight_line');
  const [usefulLife, setUsefulLife] = useState('60');
  const [salvageValue, setSalvageValue] = useState('');
  const [description, setDescription] = useState('');

  function handleSave() {
    if (!name) {
      toast.error('Asset name is required');
      return;
    }
    createMutation.mutate(
      {
        name,
        categoryId: categoryId || undefined,
        serialNumber: serialNumber || undefined,
        model: model || undefined,
        manufacturer: manufacturer || undefined,
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        purchasePrice: parseFloat(purchasePrice) || 0,
        supplier: supplier || undefined,
        location: location || undefined,
        assignedTo: assignedTo || undefined,
        depreciationMethod,
        usefulLife: parseInt(usefulLife) || 60,
        salvageValue: parseFloat(salvageValue) || 0,
        description: description || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success('Asset created');
          const assetId = (data as { id?: string })?.id;
          if (assetId) {
            router.push(`/assets/${assetId}`);
          } else {
            router.push('/assets/list');
          }
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create asset')),
      },
    );
  }

  return (
    <FormPage
      title="New Asset"
      breadcrumbs={[
        { label: 'Assets', href: '/assets' },
        { label: 'Asset Register', href: '/assets/list' },
        { label: 'New Asset' },
      ]}
      backHref="/assets/list"
      primaryAction={{
        label: 'Create Asset',
        onClick: handleSave,
        loading: createMutation.isPending,
      }}
      secondaryActions={[
        { label: 'Cancel', onClick: () => router.push('/assets/list'), variant: 'outline' },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="Basic Information" columns={2}>
          <FormField label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Asset name"
            />
          </FormField>
          <FormField label="Category">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Serial Number">
            <Input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Serial number"
            />
          </FormField>
          <FormField label="Model">
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model"
            />
          </FormField>
          <FormField label="Manufacturer">
            <Input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="Manufacturer"
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={3}
            />
          </FormField>
        </FormSection>

        <FormSection title="Purchase Information" columns={2}>
          <FormField label="Purchase Date">
            <DatePicker value={purchaseDate} onChange={setPurchaseDate} />
          </FormField>
          <FormField label="Purchase Price">
            <Input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Supplier">
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Supplier name"
            />
          </FormField>
        </FormSection>

        <FormSection title="Location & Assignment" columns={2}>
          <FormField label="Location">
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
            />
          </FormField>
          <FormField label="Assigned To">
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Person or team"
            />
          </FormField>
        </FormSection>

        <FormSection title="Depreciation" columns={2}>
          <FormField label="Depreciation Method">
            <Select value={depreciationMethod} onValueChange={setDepreciationMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {depreciationMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Useful Life (months)">
            <Input
              type="number"
              value={usefulLife}
              onChange={(e) => setUsefulLife(e.target.value)}
              placeholder="60"
            />
          </FormField>
          <FormField label="Salvage Value">
            <Input
              type="number"
              value={salvageValue}
              onChange={(e) => setSalvageValue(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
