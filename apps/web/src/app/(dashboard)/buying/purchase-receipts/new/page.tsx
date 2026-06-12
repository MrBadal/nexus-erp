'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreatePurchaseReceipt } from '@/hooks/use-buying';

interface ReceiptItem {
  description: string;
  orderedQty: string;
  receivedQty: string;
  unitPrice: string;
}

export default function NewPurchaseReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createReceipt = useCreatePurchaseReceipt();

  const [purchaseOrderId, setPurchaseOrderId] = useState(searchParams.get('poId') || '');
  const [supplierName, setSupplierName] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [warehouse, setWarehouse] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([{ description: '', orderedQty: '', receivedQty: '', unitPrice: '' }]);

  const addItem = () => setItems([...items, { description: '', orderedQty: '', receivedQty: '', unitPrice: '' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ReceiptItem, value: string) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const handleSubmit = () => {
    if (!supplierName.trim()) { toast.error('Supplier name is required'); return; }
    if (!warehouse.trim()) { toast.error('Warehouse is required'); return; }

    createReceipt.mutate(
      {
        purchaseOrderId: purchaseOrderId || undefined,
        supplier: supplierName,
        receiptDate,
        warehouse,
        notes: notes || undefined,
        items: items.filter((it) => it.description.trim()).map((it, i) => ({
          lineNumber: i + 1,
          description: it.description,
          orderedQty: it.orderedQty,
          receivedQty: it.receivedQty || it.orderedQty,
          unitPrice: it.unitPrice,
          lineTotal: String((Number(it.receivedQty || it.orderedQty) || 0) * (Number(it.unitPrice) || 0)),
        })),
      },
      {
        onSuccess: () => { toast.success('Purchase receipt created'); router.push('/buying/purchase-receipts'); },
        onError: (error: Error) => { toast.error(error.message || 'Failed to create purchase receipt'); },
      },
    );
  };

  return (
    <FormPage
      title="New Purchase Receipt"
      subtitle="Record goods received from supplier"
      backHref="/buying/purchase-receipts"
      breadcrumbs={[
        { label: 'Buying', href: '/buying' },
        { label: 'Purchase Receipts', href: '/buying/purchase-receipts' },
        { label: 'New Receipt' },
      ]}
      primaryAction={{ label: 'Create Receipt', onClick: handleSubmit, loading: createReceipt.isPending }}
      secondaryActions={[{ label: 'Cancel', onClick: () => router.push('/buying/purchase-receipts'), variant: 'outline' }]}
    >
      <div className="space-y-6">
        <FormSection title="Receipt Details" columns={2}>
          <FormField label="Purchase Order">
            <Input placeholder="Link to PO (optional)" value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} />
          </FormField>
          <FormField label="Supplier" required>
            <Input placeholder="Supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          </FormField>
          <FormField label="Receipt Date" required>
            <Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
          </FormField>
          <FormField label="Warehouse" required>
            <Input placeholder="Receiving warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Items Received" columns={1}>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_90px_90px_110px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Description</span><span>Ordered</span><span>Received</span><span>Unit Price</span><span />
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_90px_110px_40px] gap-2 items-center">
                <Input placeholder="Item description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                <Input type="number" min="0" value={item.orderedQty} onChange={(e) => updateItem(i, 'orderedQty', e.target.value)} />
                <Input type="number" min="0" value={item.receivedQty} onChange={(e) => updateItem(i, 'receivedQty', e.target.value)} placeholder={item.orderedQty || '0'} />
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} />
                <Button variant="ghost" size="icon" onClick={() => removeItem(i)} disabled={items.length === 1}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Item</Button>
          </div>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea placeholder="Receipt notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
