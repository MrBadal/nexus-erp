'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  InlineGrid,
  type InlineGridColumn,
} from '@/components/ui/inline-grid';
import {
  useBom,
  useUpdateBom,
  useDeleteBom,
  useActivateBom,
  useDeactivateBom,
} from '@/hooks/use-manufacturing';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BomLine {
  componentItemId: string;
  quantity: number;
  uom: string;
  scrapPercent: number;
  notes: string;
  [key: string]: unknown;
}

type BomStatus = 'draft' | 'active' | 'inactive';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<BomStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  draft: 'default',
  active: 'success',
  inactive: 'muted',
};

const statusLabelMap: Record<BomStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  inactive: 'Inactive',
};

// ---------------------------------------------------------------------------
// BOM line columns
// ---------------------------------------------------------------------------

const lineColumns: InlineGridColumn<BomLine>[] = [
  {
    key: 'componentItemId',
    header: 'Component Item',
    type: 'text',
    width: '2fr',
    placeholder: 'Item name or ID',
  },
  {
    key: 'quantity',
    header: 'Qty',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    key: 'uom',
    header: 'UOM',
    type: 'text',
    width: '80px',
    placeholder: 'Nos',
  },
  {
    key: 'scrapPercent',
    header: 'Scrap %',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    key: 'notes',
    header: 'Notes',
    type: 'text',
    width: '1fr',
    placeholder: 'Optional notes',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BomDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bomId = params.id;

  const { data: bom, isLoading, error } = useBom(bomId);
  const updateMutation = useUpdateBom();
  const deleteMutation = useDeleteBom();
  const activateMutation = useActivateBom();
  const deactivateMutation = useDeactivateBom();

  // Local editable state
  const [localQuantity, setLocalQuantity] = useState<string | null>(null);
  const [localUom, setLocalUom] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [localVersion, setLocalVersion] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const [localLines, setLocalLines] = useState<BomLine[] | null>(null);

  const rawStatus = (bom as { status?: string } | undefined)?.status ?? 'draft';
  const status: BomStatus = (rawStatus === 'active' || rawStatus === 'inactive') ? rawStatus : 'draft';
  const isDraft = status === 'draft';
  const isActive = status === 'active';
  const isReadOnly = isActive || status === 'inactive';

  const currentQuantity = localQuantity ?? String((bom as { quantity?: number } | undefined)?.quantity ?? '1');
  const currentUom = localUom ?? (bom as { uom?: string } | undefined)?.uom ?? '';
  const currentDescription = localDescription ?? (bom as { description?: string } | undefined)?.description ?? '';
  const currentVersion = localVersion ?? (bom as { version?: string } | undefined)?.version ?? '';
  const currentNotes = localNotes ?? (bom as { notes?: string } | undefined)?.notes ?? '';

  const lines = useMemo<BomLine[]>(() => {
    if (localLines) return localLines;
    const apiLines = (bom as { lines?: unknown[] } | undefined)?.lines;
    if (apiLines && apiLines.length > 0) {
      return apiLines.map((l) => {
        const line = l as Record<string, unknown>;
        return {
          componentItemId: String(line.componentItemId ?? ''),
          quantity: Number(line.quantity ?? 1),
          uom: String(line.uom ?? ''),
          scrapPercent: Number(line.scrapPercent ?? 0),
          notes: String(line.notes ?? ''),
        };
      });
    }
    return [{ componentItemId: '', quantity: 1, uom: 'Nos', scrapPercent: 0, notes: '' }];
  }, [localLines, bom]);

  // Handlers
  function handleSave() {
    if (!bom) return;
    updateMutation.mutate(
      {
        id: bomId,
        data: {
          quantity: parseFloat(currentQuantity),
          uom: currentUom,
          description: currentDescription,
          version: currentVersion,
          notes: currentNotes,
          lines,
        },
      },
      {
        onSuccess: () => toast.success('BOM saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save BOM')),
      },
    );
  }

  function handleActivate() {
    activateMutation.mutate(bomId, {
      onSuccess: () => toast.success('BOM activated'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to activate BOM')),
    });
  }

  function handleDeactivate() {
    deactivateMutation.mutate(bomId, {
      onSuccess: () => toast.success('BOM deactivated'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to deactivate BOM')),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(bomId, {
      onSuccess: () => {
        toast.success('BOM deleted');
        router.push('/manufacturing/bom');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete BOM')),
    });
  }

  // Loading / Error
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !bom) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading BOM' : 'BOM not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/manufacturing/bom')}
          >
            Back to BOMs
          </button>
        </div>
      </div>
    );
  }

  const bomNumber = (bom as { bomNumber?: string }).bomNumber ?? bomId;
  const itemName = (bom as { itemName?: string; itemId?: string }).itemName ?? (bom as { itemId?: string }).itemId ?? '';
  const itemId = (bom as { itemId?: string }).itemId ?? '';
  const createdAt = (bom as { createdAt?: string }).createdAt ?? '';
  const updatedAt = (bom as { updatedAt?: string }).updatedAt ?? '';

  // Actions
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
            {
              label: 'Activate BOM',
              onClick: handleActivate,
              variant: 'outline' as const,
            },
            {
              label: 'Create Work Order',
              onClick: () => router.push(`/manufacturing/work-orders/new?bomId=${bomId}`),
              variant: 'outline' as const,
            },
          ],
          dangerAction: { label: 'Delete', onClick: handleDelete },
        };
      case 'active':
        return {
          primaryAction: {
            label: 'Create Work Order',
            onClick: () => router.push(`/manufacturing/work-orders/new?bomId=${bomId}`),
          },
          secondaryActions: [
            {
              label: 'Deactivate',
              onClick: handleDeactivate,
              variant: 'outline' as const,
            },
          ],
        };
      default:
        return {
          secondaryActions: [
            {
              label: 'Create Work Order',
              onClick: () => router.push(`/manufacturing/work-orders/new?bomId=${bomId}`),
              variant: 'outline' as const,
            },
          ],
        };
    }
  }

  const actions = getActions();

  const meta = [
    { label: 'BOM #', value: <span className="font-mono text-sm">{bomNumber}</span> },
    { label: 'Item', value: itemName },
    { label: 'Item ID', value: <span className="font-mono text-xs text-muted-foreground">{itemId}</span> },
    { label: 'Created', value: formatDate(createdAt) },
    { label: 'Last Updated', value: formatDate(updatedAt) },
  ];

  return (
    <FormPage
      title={bomNumber}
      breadcrumbs={[
        { label: 'Manufacturing', href: '/manufacturing' },
        { label: 'Bill of Materials', href: '/manufacturing/bom' },
        { label: bomNumber },
      ]}
      backHref="/manufacturing/bom"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      dangerAction={actions.dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Header Fields */}
        <FormSection title="BOM Details" columns={2}>
          <FormField label="BOM Number">
            <Input value={bomNumber} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Status">
            <div className="flex items-center h-9">
              <Badge
                variant={
                  status === 'active' ? 'default' : 'secondary'
                }
              >
                {statusLabelMap[status]}
              </Badge>
            </div>
          </FormField>
          <FormField label="Finished Good (Item)">
            <Input
              value={itemName}
              readOnly
              className="bg-muted"
              placeholder="Item name"
            />
          </FormField>
          <FormField label="Version">
            <Input
              value={currentVersion}
              onChange={(e) => setLocalVersion(e.target.value)}
              placeholder="e.g., 1.0"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Quantity">
            <Input
              type="number"
              value={currentQuantity}
              onChange={(e) => setLocalQuantity(e.target.value)}
              disabled={isReadOnly}
              min={0}
            />
          </FormField>
          <FormField label="Unit of Measure (UOM)">
            <Input
              value={currentUom}
              onChange={(e) => setLocalUom(e.target.value)}
              placeholder="e.g., Nos, Kg, Set"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={currentDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="BOM description"
              disabled={isReadOnly}
              rows={2}
            />
          </FormField>
        </FormSection>

        {/* BOM Lines */}
        <FormSection title="BOM Lines / Components" columns={1} collapsible={false}>
          <InlineGrid<BomLine>
            columns={lineColumns}
            rows={lines}
            onChange={(rows) => setLocalLines(rows)}
            onAddRow={() =>
              setLocalLines([...lines, { componentItemId: '', quantity: 1, uom: 'Nos', scrapPercent: 0, notes: '' }])
            }
            onRemoveRow={(index) => setLocalLines(lines.filter((_, i) => i !== index))}
            disabled={isReadOnly}
            addRowLabel="+ Add Component"
          />
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes" columns={1}>
          <FormField label="Internal Notes">
            <Textarea
              value={currentNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Internal notes"
              disabled={isReadOnly}
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
