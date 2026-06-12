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
  useAssetCategory,
  useUpdateAssetCategory,
  useDeleteAssetCategory,
} from '@/hooks/use-assets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryData {
  id: string;
  code?: string;
  name: string;
  description?: string;
  depreciationMethod?: string;
  usefulLife?: number | string;
  depreciationRate?: number | string;
  createdAt?: string;
  updatedAt?: string;
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

export default function AssetCategoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const categoryId = params.id;

  const { data: category, isLoading, error } = useAssetCategory(categoryId);
  const updateMutation = useUpdateAssetCategory();
  const deleteMutation = useDeleteAssetCategory();

  const categoryData = category as CategoryData | undefined;

  // Local editable state
  const [localName, setLocalName] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [localDepreciationMethod, setLocalDepreciationMethod] = useState<string | null>(null);
  const [localUsefulLife, setLocalUsefulLife] = useState<string | null>(null);
  const [localDepreciationRate, setLocalDepreciationRate] = useState<string | null>(null);

  const currentName = localName ?? categoryData?.name ?? '';
  const currentDescription = localDescription ?? categoryData?.description ?? '';
  const currentDepreciationMethod = localDepreciationMethod ?? categoryData?.depreciationMethod ?? 'straight_line';
  const currentUsefulLife = localUsefulLife ?? String(categoryData?.usefulLife ?? '60');
  const currentDepreciationRate = localDepreciationRate ?? String(categoryData?.depreciationRate ?? '0');

  function handleSave() {
    if (!categoryData) return;
    updateMutation.mutate(
      {
        id: categoryId,
        data: {
          name: currentName,
          description: currentDescription || undefined,
          depreciationMethod: currentDepreciationMethod,
          usefulLife: parseInt(currentUsefulLife) || 60,
          depreciationRate: parseFloat(currentDepreciationRate) || 0,
        },
      },
      {
        onSuccess: () => toast.success('Category saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save category')),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(categoryId, {
      onSuccess: () => {
        toast.success('Category deleted');
        router.push('/assets/categories');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete category')),
    });
  }

  // ---------- Loading / Error states ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !categoryData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading category' : 'Category not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/assets/categories')}
          >
            Back to categories
          </button>
        </div>
      </div>
    );
  }

  const meta = [
    { label: 'Code', value: <span className="font-mono">{categoryData.code ?? categoryId}</span> },
  ];

  return (
    <FormPage
      title={categoryData.name}
      breadcrumbs={[
        { label: 'Assets', href: '/assets' },
        { label: 'Categories', href: '/assets/categories' },
        { label: categoryData.name },
      ]}
      backHref="/assets/categories"
      primaryAction={{
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      dangerAction={{ label: 'Delete', onClick: handleDelete }}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Category Details" columns={2}>
          <FormField label="Code">
            <Input
              value={categoryData.code ?? categoryId}
              readOnly
              className="font-mono bg-muted"
            />
          </FormField>
          <FormField label="Name">
            <Input
              value={currentName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Category name"
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={currentDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Description"
              rows={3}
            />
          </FormField>
        </FormSection>

        <FormSection title="Depreciation Settings" columns={2}>
          <FormField label="Depreciation Method">
            <Select
              value={currentDepreciationMethod}
              onValueChange={(v) => setLocalDepreciationMethod(v)}
            >
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
              value={currentUsefulLife}
              onChange={(e) => setLocalUsefulLife(e.target.value)}
              placeholder="60"
            />
          </FormField>
          <FormField label="Depreciation Rate (%)">
            <Input
              type="number"
              value={currentDepreciationRate}
              onChange={(e) => setLocalDepreciationRate(e.target.value)}
              placeholder="0"
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
