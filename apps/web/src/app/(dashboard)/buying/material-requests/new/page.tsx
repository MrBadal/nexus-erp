'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCreateMaterialRequest } from '@/hooks/use-buying';
import { useItems } from '@/hooks/use-inventory';
import { useSuppliers } from '@/hooks/use-buying';

interface LineItem {
  itemId: string;
  description: string;
  quantity: string;
  uom: string;
  preferredSupplierId: string;
}

export default function NewMaterialRequestPage() {
  const router = useRouter();
  const createMR = useCreateMaterialRequest();
  const { data: itemsData } = useItems();
  const { data: suppliersData } = useSuppliers();
  const items = itemsData ?? [];
  const suppliers = suppliersData ?? [];

  const [form, setForm] = useState({
    requestType: 'purchase' as 'purchase' | 'transfer' | 'manufacture',
    requestDate: new Date().toISOString().split('T')[0],
    requiredDate: '',
    department: '',
    purpose: '',
    notes: '',
  });

  const [lines, setLines] = useState<LineItem[]>([
    { itemId: '', description: '', quantity: '1', uom: 'Nos', preferredSupplierId: '' },
  ]);

  const addLine = () => {
    setLines([...lines, { itemId: '', description: '', quantity: '1', uom: 'Nos', preferredSupplierId: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.itemId && parseFloat(l.quantity) > 0);
    if (validLines.length === 0) return;

    await createMR.mutateAsync({
      ...form,
      requiredDate: form.requiredDate || undefined,
      lines: validLines.map((l) => ({
        itemId: l.itemId,
        description: l.description || undefined,
        quantity: l.quantity,
        uom: l.uom,
        preferredSupplierId: l.preferredSupplierId || undefined,
      })),
    } as Record<string, unknown>);
    router.push('/buying/material-requests');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/buying/material-requests">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Material Request</h1>
          <p className="text-sm text-muted-foreground">Request items for purchase, transfer, or manufacturing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Request Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Request Type</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.requestType}
                onChange={(e) => setForm({ ...form, requestType: e.target.value as 'purchase' | 'transfer' | 'manufacture' })}
              >
                <option value="purchase">Purchase</option>
                <option value="transfer">Transfer</option>
                <option value="manufacture">Manufacture</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Request Date</label>
              <input
                type="date"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.requestDate}
                onChange={(e) => setForm({ ...form, requestDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Required By</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.requiredDate}
                onChange={(e) => setForm({ ...form, requiredDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Department</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g., Production, Maintenance"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Purpose</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Reason for the request"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Items</h2>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Item</label>}
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={line.itemId}
                    onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                    required
                  >
                    <option value="">Select item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code ? `${item.code} - ` : ''}{item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Qty</label>}
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">UoM</label>}
                  <input
                    type="text"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={line.uom}
                    onChange={(e) => updateLine(idx, 'uom', e.target.value)}
                  />
                </div>
                <div className="col-span-4">
                  {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Preferred Supplier</label>}
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={line.preferredSupplierId}
                    onChange={(e) => updateLine(idx, 'preferredSupplierId', e.target.value)}
                  >
                    <option value="">No preference</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/buying/material-requests">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createMR.isPending}>
            {createMR.isPending ? 'Creating...' : 'Create Material Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}
