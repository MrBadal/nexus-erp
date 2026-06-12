'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil } from 'lucide-react';
import { useNumberSeriesList, useUpdateNumberSeries, type NumberSeries } from '@/hooks/use-number-series';

const docTypeLabels: Record<string, string> = {
  invoice: 'Sales Invoice',
  bill: 'Purchase Bill',
  payment: 'Payment',
  sales_order: 'Sales Order',
  purchase_order: 'Purchase Order',
  delivery_note: 'Delivery Note',
  quotation: 'Quotation',
  supplier_quotation: 'Supplier Quotation',
  journal_entry: 'Journal Entry',
  purchase_receipt: 'Purchase Receipt (GRN)',
  stock_adjustment: 'Stock Adjustment',
  MR: 'Material Request',
  EC: 'Expense Claim',
  EMP: 'Employee',
};

export default function NumberSeriesPage() {
  const { data, isLoading } = useNumberSeriesList();
  const series = (data as NumberSeries[] | undefined) ?? [];
  const update = useUpdateNumberSeries();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ prefix: '', suffix: '', padLength: 6, resetAnnually: true });

  const startEdit = (item: NumberSeries) => {
    setEditingId(item.id);
    setEditForm({
      prefix: item.prefix,
      suffix: item.suffix || '',
      padLength: item.padLength,
      resetAnnually: item.resetAnnually,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    await update.mutateAsync({
      id: editingId,
      prefix: editForm.prefix,
      suffix: editForm.suffix || undefined,
      padLength: editForm.padLength,
      resetAnnually: editForm.resetAnnually,
    });
    setEditingId(null);
  };

  const getPreview = (item: NumberSeries) => {
    const form = editingId === item.id ? editForm : { prefix: item.prefix, suffix: item.suffix || '', padLength: item.padLength };
    const num = (item.currentNumber + 1).toString().padStart(form.padLength, '0');
    return `${form.prefix}${num}${form.suffix}`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Number Series</h1>
        <p className="text-sm text-muted-foreground">
          Configure document numbering prefixes, suffixes, and padding for each document type
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Document Type</th>
                <th className="px-4 py-3 text-left font-medium">Prefix</th>
                <th className="px-4 py-3 text-left font-medium">Suffix</th>
                <th className="px-4 py-3 text-left font-medium">Pad</th>
                <th className="px-4 py-3 text-left font-medium">Current #</th>
                <th className="px-4 py-3 text-left font-medium">Next Preview</th>
                <th className="px-4 py-3 text-left font-medium">Reset</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : series.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No number series configured. Create a document to auto-initialize.
                  </td>
                </tr>
              ) : (
                series.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {docTypeLabels[item.documentType] || item.documentType}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          className="w-32 rounded border bg-background px-2 py-1 text-sm"
                          value={editForm.prefix}
                          onChange={(e) => setEditForm({ ...editForm, prefix: e.target.value })}
                        />
                      ) : (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.prefix}</code>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          className="w-20 rounded border bg-background px-2 py-1 text-sm"
                          value={editForm.suffix}
                          onChange={(e) => setEditForm({ ...editForm, suffix: e.target.value })}
                        />
                      ) : (
                        item.suffix ? <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.suffix}</code> : '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className="w-14 rounded border bg-background px-2 py-1 text-sm"
                          value={editForm.padLength}
                          onChange={(e) => setEditForm({ ...editForm, padLength: parseInt(e.target.value) || 6 })}
                        />
                      ) : (
                        item.padLength
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">{item.currentNumber}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                        {getPreview(item)}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={editForm.resetAnnually}
                            onChange={(e) => setEditForm({ ...editForm, resetAnnually: e.target.checked })}
                          />
                          Yearly
                        </label>
                      ) : (
                        item.resetAnnually ? 'Yes' : 'No'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === item.id ? (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={update.isPending}>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
