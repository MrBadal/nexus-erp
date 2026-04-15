'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreateQuotation, useCustomers } from '@/hooks/use-selling';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const createQuotation = useCreateQuotation();
  const { data: customers } = useCustomers();

  const [customerId, setCustomerId] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{ description: '', quantity: '1', unitPrice: '' }]);

  const addLine = () => setLines([...lines, { description: '', quantity: '1', unitPrice: '' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, value: string) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    setLines(updated);
  };

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  const handleSubmit = () => {
    if (!customerId) { toast.error('Customer is required'); return; }
    if (lines.length === 0 || !lines[0].description.trim()) { toast.error('At least one line item is required'); return; }

    createQuotation.mutate(
      {
        customerId,
        quotationDate,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        lines: lines.filter((l) => l.description.trim()).map((l, i) => ({
          lineNumber: i + 1,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: String((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)),
        })),
      },
      {
        onSuccess: () => { toast.success('Quotation created'); router.push('/selling/quotations'); },
        onError: (error: Error) => { toast.error(error.message || 'Failed to create quotation'); },
      },
    );
  };

  return (
    <FormPage
      title="New Quotation"
      subtitle="Create a new sales quotation"
      backHref="/selling/quotations"
      breadcrumbs={[
        { label: 'Selling', href: '/selling' },
        { label: 'Quotations', href: '/selling/quotations' },
        { label: 'New Quotation' },
      ]}
      primaryAction={{ label: 'Create Quotation', onClick: handleSubmit, loading: createQuotation.isPending }}
      secondaryActions={[{ label: 'Cancel', onClick: () => router.push('/selling/quotations'), variant: 'outline' }]}
    >
      <div className="space-y-6">
        <FormSection title="Quotation Details" columns={2}>
          <FormField label="Customer" required>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {(customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Quotation Date" required>
            <Input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} />
          </FormField>
          <FormField label="Valid Until">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Line Items" columns={1}>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_100px_120px_120px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Description</span><span>Qty</span><span>Unit Price</span><span>Total</span><span />
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_120px_120px_40px] gap-2 items-center">
                <Input placeholder="Item description" value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} />
                <Input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={line.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} />
                <Input value={formatCurrency((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0))} readOnly className="bg-muted" />
                <Button variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lines.length === 1}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLine} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Line</Button>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <div className="text-sm"><span className="text-muted-foreground mr-4">Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
          </div>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea placeholder="Additional notes or terms..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
