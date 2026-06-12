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
  InlineGrid,
  type InlineGridColumn,
} from '@/components/ui/inline-grid';
import { useCreateBom } from '@/hooks/use-manufacturing';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BomLine {
  componentItemId: string;
  quantity: number;
  uom: string;
  scrapPercent: number;
  [key: string]: unknown;
}

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
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewBomPage() {
  const router = useRouter();
  const createMutation = useCreateBom();

  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [uom, setUom] = useState('Nos');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0');
  const [lines, setLines] = useState<BomLine[]>([
    { componentItemId: '', quantity: 1, uom: 'Nos', scrapPercent: 0 },
  ]);

  function handleSubmit() {
    if (!itemId.trim()) {
      toast.error('Item ID is required');
      return;
    }
    createMutation.mutate(
      {
        itemId: itemId.trim(),
        quantity: parseFloat(quantity) || 1,
        uom,
        description,
        version,
        lines: lines.filter((l) => l.componentItemId.trim() !== ''),
      },
      {
        onSuccess: (data) => {
          toast.success('BOM created');
          const id = (data as { id?: string }).id;
          router.push(id ? `/manufacturing/bom/${id}` : '/manufacturing/bom');
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create BOM')),
      },
    );
  }

  return (
    <FormPage
      title="New Bill of Materials"
      breadcrumbs={[
        { label: 'Manufacturing', href: '/manufacturing' },
        { label: 'Bill of Materials', href: '/manufacturing/bom' },
        { label: 'New BOM' },
      ]}
      backHref="/manufacturing/bom"
      primaryAction={{
        label: 'Create BOM',
        onClick: handleSubmit,
        loading: createMutation.isPending,
      }}
    >
      <div className="space-y-6">
        <FormSection title="BOM Details" columns={2}>
          <FormField label="Finished Good (Item ID)" required>
            <Input
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder="Enter item name or ID"
            />
          </FormField>
          <FormField label="Version">
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g., 1.0"
            />
          </FormField>
          <FormField label="Quantity">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={0}
              step={0.001}
            />
          </FormField>
          <FormField label="Unit of Measure (UOM)">
            <Input
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              placeholder="e.g., Nos, Kg, Set"
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="BOM description"
              rows={2}
            />
          </FormField>
        </FormSection>

        <FormSection title="Components / BOM Lines" columns={1} collapsible={false}>
          <InlineGrid<BomLine>
            columns={lineColumns}
            rows={lines}
            onChange={(rows) => setLines(rows)}
            onAddRow={() =>
              setLines([...lines, { componentItemId: '', quantity: 1, uom: 'Nos', scrapPercent: 0 }])
            }
            onRemoveRow={(index) => setLines(lines.filter((_, i) => i !== index))}
            addRowLabel="+ Add Component"
          />
        </FormSection>
      </div>
    </FormPage>
  );
}
