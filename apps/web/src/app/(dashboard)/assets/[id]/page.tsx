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
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  useAsset,
  useUpdateAsset,
  useDeleteAsset,
  useSubmitAsset,
  useActivateAsset,
  useDisposeAsset,
  useScrapAsset,
  useAssetCategories,
} from '@/hooks/use-assets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssetStatus = 'draft' | 'submitted' | 'active' | 'in_use' | 'maintenance' | 'disposed' | 'scrapped';

interface AssetData {
  id: string;
  assetCode?: string;
  assetNumber?: string;
  name: string;
  categoryId?: string;
  category?: string;
  description?: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  purchaseDate?: string;
  purchasePrice?: number | string;
  purchaseAmount?: number | string;
  supplier?: string;
  currentValue?: number | string;
  depreciationMethod?: string;
  usefulLife?: number | string;
  salvageValue?: number | string;
  location?: string;
  assignedTo?: string;
  department?: string;
  status: AssetStatus;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

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

const statusVariantMap: Record<AssetStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  draft: 'default',
  submitted: 'warning',
  active: 'success',
  in_use: 'success',
  maintenance: 'warning',
  disposed: 'muted',
  scrapped: 'danger',
};

const statusLabelMap: Record<AssetStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  active: 'Active',
  in_use: 'In Use',
  maintenance: 'Maintenance',
  disposed: 'Disposed',
  scrapped: 'Scrapped',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assetId = params.id;

  const { data: asset, isLoading, error } = useAsset(assetId);
  const { data: categoriesData } = useAssetCategories();
  const categories: CategoryData[] = (categoriesData as CategoryData[] | undefined) ?? [];

  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();
  const submitMutation = useSubmitAsset();
  const activateMutation = useActivateAsset();
  const disposeMutation = useDisposeAsset();
  const scrapMutation = useScrapAsset();

  const assetData = asset as AssetData | undefined;

  // Local editable state
  const [localName, setLocalName] = useState<string | null>(null);
  const [localCategoryId, setLocalCategoryId] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [localSerialNumber, setLocalSerialNumber] = useState<string | null>(null);
  const [localModel, setLocalModel] = useState<string | null>(null);
  const [localManufacturer, setLocalManufacturer] = useState<string | null>(null);
  const [localPurchaseDate, setLocalPurchaseDate] = useState<Date | null>(null);
  const [localPurchasePrice, setLocalPurchasePrice] = useState<string | null>(null);
  const [localSupplier, setLocalSupplier] = useState<string | null>(null);
  const [localDepreciationMethod, setLocalDepreciationMethod] = useState<string | null>(null);
  const [localUsefulLife, setLocalUsefulLife] = useState<string | null>(null);
  const [localSalvageValue, setLocalSalvageValue] = useState<string | null>(null);
  const [localLocation, setLocalLocation] = useState<string | null>(null);
  const [localAssignedTo, setLocalAssignedTo] = useState<string | null>(null);
  const [localDepartment, setLocalDepartment] = useState<string | null>(null);

  const status: AssetStatus = (assetData?.status ?? 'draft') as AssetStatus;
  const isReadOnly = status === 'disposed' || status === 'scrapped';
  const isEditable = !isReadOnly;

  const currentName = localName ?? assetData?.name ?? '';
  const currentCategoryId = localCategoryId ?? assetData?.categoryId ?? '';
  const currentDescription = localDescription ?? assetData?.description ?? '';
  const currentSerialNumber = localSerialNumber ?? assetData?.serialNumber ?? '';
  const currentModel = localModel ?? assetData?.model ?? '';
  const currentManufacturer = localManufacturer ?? assetData?.manufacturer ?? '';
  const currentPurchaseDate = localPurchaseDate ?? (assetData?.purchaseDate ? new Date(assetData.purchaseDate) : new Date());
  const currentPurchasePrice = localPurchasePrice ?? String(assetData?.purchasePrice ?? assetData?.purchaseAmount ?? '0');
  const currentSupplier = localSupplier ?? assetData?.supplier ?? '';
  const currentDepreciationMethod = localDepreciationMethod ?? assetData?.depreciationMethod ?? 'straight_line';
  const currentUsefulLife = localUsefulLife ?? String(assetData?.usefulLife ?? '60');
  const currentSalvageValue = localSalvageValue ?? String(assetData?.salvageValue ?? '0');
  const currentLocation = localLocation ?? assetData?.location ?? '';
  const currentAssignedTo = localAssignedTo ?? assetData?.assignedTo ?? '';
  const currentDepartment = localDepartment ?? assetData?.department ?? '';

  function handleSave() {
    if (!assetData) return;
    updateMutation.mutate(
      {
        id: assetId,
        data: {
          name: currentName,
          categoryId: currentCategoryId || undefined,
          description: currentDescription || undefined,
          serialNumber: currentSerialNumber || undefined,
          model: currentModel || undefined,
          manufacturer: currentManufacturer || undefined,
          purchaseDate: currentPurchaseDate.toISOString().split('T')[0],
          purchasePrice: parseFloat(currentPurchasePrice) || 0,
          supplier: currentSupplier || undefined,
          depreciationMethod: currentDepreciationMethod,
          usefulLife: parseInt(currentUsefulLife) || 60,
          salvageValue: parseFloat(currentSalvageValue) || 0,
          location: currentLocation || undefined,
          assignedTo: currentAssignedTo || undefined,
          department: currentDepartment || undefined,
        },
      },
      {
        onSuccess: () => toast.success('Asset saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save asset')),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(assetId, {
      onSuccess: () => {
        toast.success('Asset deleted');
        router.push('/assets/list');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete asset')),
    });
  }

  function handleSubmit() {
    submitMutation.mutate(assetId, {
      onSuccess: () => toast.success('Asset submitted'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to submit asset')),
    });
  }

  function handleActivate() {
    activateMutation.mutate(assetId, {
      onSuccess: () => toast.success('Asset activated'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to activate asset')),
    });
  }

  function handleDispose() {
    disposeMutation.mutate(assetId, {
      onSuccess: () => toast.success('Asset disposed'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to dispose asset')),
    });
  }

  function handleScrap() {
    scrapMutation.mutate(assetId, {
      onSuccess: () => toast.success('Asset scrapped'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to scrap asset')),
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

  if (error || !assetData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading asset' : 'Asset not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/assets/list')}
          >
            Back to assets
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actions ----------

  function getActions() {
    switch (status) {
      case 'draft':
        return {
          primaryAction: {
            label: 'Save',
            onClick: handleSave,
            loading: updateMutation.isPending,
          },
          secondaryActions: [
            { label: 'Submit Asset', onClick: handleSubmit, variant: 'outline' as const },
          ],
          dangerAction: { label: 'Delete', onClick: handleDelete },
        };
      case 'submitted':
        return {
          primaryAction: {
            label: 'Activate Asset',
            onClick: handleActivate,
            loading: activateMutation.isPending,
          },
          secondaryActions: [
            { label: 'Save', onClick: handleSave, variant: 'outline' as const },
          ],
        };
      case 'active':
      case 'in_use':
        return {
          primaryAction: {
            label: 'Save',
            onClick: handleSave,
            loading: updateMutation.isPending,
          },
          secondaryActions: [
            { label: 'Dispose Asset', onClick: handleDispose, variant: 'outline' as const },
            { label: 'Scrap Asset', onClick: handleScrap, variant: 'outline' as const },
          ],
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    {
      label: 'Asset Code',
      value: (
        <span className="font-mono">
          {assetData.assetCode ?? assetData.assetNumber ?? 'Loading...'}
        </span>
      ),
    },
    { label: 'Status', value: statusLabelMap[status] },
    { label: 'Current Value', value: formatCurrency(Number(assetData.currentValue ?? 0)) },
    { label: 'Created', value: formatDate(assetData.createdAt ?? '') },
  ];

  return (
    <FormPage
      title={assetData.name}
      breadcrumbs={[
        { label: 'Assets', href: '/assets' },
        { label: 'Asset Register', href: '/assets/list' },
        { label: assetData.name },
      ]}
      backHref="/assets/list"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      dangerAction={actions.dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <FormSection title="Basic Information" columns={2}>
          <FormField label="Asset Code">
            <Input
              value={assetData.assetCode ?? assetData.assetNumber ?? 'Loading...'}
              readOnly
              className="font-mono bg-muted"
            />
          </FormField>
          <FormField label="Name">
            <Input
              value={currentName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Asset name"
              disabled={!isEditable}
            />
          </FormField>
          <FormField label="Category">
            <Select
              value={currentCategoryId}
              onValueChange={(v) => setLocalCategoryId(v)}
              disabled={!isEditable}
            >
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
              value={currentSerialNumber}
              onChange={(e) => setLocalSerialNumber(e.target.value)}
              placeholder="Serial number"
              disabled={!isEditable}
            />
          </FormField>
          <FormField label="Model">
            <Input
              value={currentModel}
              onChange={(e) => setLocalModel(e.target.value)}
              placeholder="Model"
              disabled={!isEditable}
            />
          </FormField>
          <FormField label="Manufacturer">
            <Input
              value={currentManufacturer}
              onChange={(e) => setLocalManufacturer(e.target.value)}
              placeholder="Manufacturer"
              disabled={!isEditable}
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={currentDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Description"
              disabled={!isEditable}
              rows={3}
            />
          </FormField>
        </FormSection>

        {/* Purchase Information */}
        <FormSection title="Purchase Information" columns={2}>
          <FormField label="Purchase Date">
            <DatePicker
              value={currentPurchaseDate}
              onChange={(d) => setLocalPurchaseDate(d)}
              disabled={!isEditable}
            />
          </FormField>
          <FormField label="Purchase Price">
            <Input
              type="number"
              value={currentPurchasePrice}
              onChange={(e) => setLocalPurchasePrice(e.target.value)}
              placeholder="0.00"
              disabled={!isEditable}
            />
          </FormField>
          <FormField label="Supplier">
            <Input
              value={currentSupplier}
              onChange={(e) => setLocalSupplier(e.target.value)}
              placeholder="Supplier name"
              disabled={!isEditable}
            />
          </FormField>
        </FormSection>

        {/* Valuation */}
        <FormSection title="Valuation & Depreciation" columns={2}>
          <FormField label="Current Value">
            <Input
              value={formatCurrency(Number(assetData.currentValue ?? 0))}
              readOnly
              className="bg-muted font-mono"
            />
          </FormField>
          <FormField label="Depreciation Method">
            <Select
              value={currentDepreciationMethod}
              onValueChange={(v) => setLocalDepreciationMethod(v)}
              disabled={!isEditable}
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
              disabled={!isEditable}
            />
          </FormField>
          <FormField label="Salvage Value">
            <Input
              type="number"
              value={currentSalvageValue}
              onChange={(e) => setLocalSalvageValue(e.target.value)}
              placeholder="0.00"
              disabled={!isEditable}
            />
          </FormField>
        </FormSection>

        {/* Location */}
        <FormSection title="Location & Assignment" columns={2}>
          <FormField label="Location">
            <Input
              value={currentLocation}
              onChange={(e) => setLocalLocation(e.target.value)}
              placeholder="Location"
              disabled={!isEditable}
            />
          </FormField>
          <FormField label="Assigned To">
            <Input
              value={currentAssignedTo}
              onChange={(e) => setLocalAssignedTo(e.target.value)}
              placeholder="Person or team"
              disabled={!isEditable}
            />
          </FormField>
          <FormField label="Department">
            <Input
              value={currentDepartment}
              onChange={(e) => setLocalDepartment(e.target.value)}
              placeholder="Department"
              disabled={!isEditable}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
