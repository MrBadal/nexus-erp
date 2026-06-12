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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateAssetCategory } from '@/hooks/use-assets';

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

export default function NewAssetCategoryPage() {
  const router = useRouter();
  const createMutation = useCreateAssetCategory();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [depreciationMethod, setDepreciationMethod] = useState('straight_line');
  const [usefulLife, setUsefulLife] = useState('60');
  const [depreciationRate, setDepreciationRate] = useState('');

  function handleSave() {
    if (!name) {
      toast.error('Category name is required');
      return;
    }
    createMutation.mutate(
      {
        name,
        description: description || undefined,
        depreciationMethod,
        usefulLife: parseInt(usefulLife) || 60,
        depreciationRate: parseFloat(depreciationRate) || 0,
      },
      {
        onSuccess: (data) => {
          toast.success('Category created');
          const id = (data as { id?: string })?.id;
          if (id) {
            router.push(`/assets/categories/${id}`);
          } else {
            router.push('/assets/categories');
          }
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create category')),
      },
    );
  }

  return (
    <FormPage
      title="New Asset Category"
      breadcrumbs={[
        { label: 'Assets', href: '/assets' },
        { label: 'Categories', href: '/assets/categories' },
        { label: 'New Category' },
      ]}
      backHref="/assets/categories"
      primaryAction={{
        label: 'Create Category',
        onClick: handleSave,
        loading: createMutation.isPending,
      }}
      secondaryActions={[
        {
          label: 'Cancel',
          onClick: () => router.push('/assets/categories'),
          variant: 'outline',
        },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="Category Details" columns={2}>
          <FormField label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
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

        <FormSection title="Depreciation Settings" columns={2}>
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
          <FormField label="Depreciation Rate (%)">
            <Input
              type="number"
              value={depreciationRate}
              onChange={(e) => setDepreciationRate(e.target.value)}
              placeholder="0"
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
