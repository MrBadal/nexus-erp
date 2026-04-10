'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateBill } from '@/hooks/use-bills';
import { useSuppliers } from '@/hooks/use-buying';

interface BillLineForm {
  description: string;
  quantity: string;
  unitPrice: string;
  taxAmount: string;
  hsnCode: string;
  accountId: string;
  itcEligible: boolean;
  itcBlockReason: string;
  rcmApplicable: boolean;
}

interface BillFormData {
  vendorId: string;
  vendorInvoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  notes: string;
  rcmApplicable: boolean;
}

const emptyLine: BillLineForm = {
  description: '',
  quantity: '1',
  unitPrice: '0',
  taxAmount: '0',
  hsnCode: '',
  accountId: '',
  itcEligible: true,
  itcBlockReason: '',
  rcmApplicable: false,
};

export default function NewBillPage() {
  const router = useRouter();
  const createBill = useCreateBill();
  const { data: suppliers } = useSuppliers();
  const [lines, setLines] = useState<BillLineForm[]>([{ ...emptyLine }]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<BillFormData>({
    defaultValues: {
      vendorId: '',
      vendorInvoiceNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      paymentTerms: 'net_30',
      notes: '',
      rcmApplicable: false,
    },
  });

  const watchRcm = watch('rcmApplicable');

  const addLine = () => {
    setLines([...lines, { ...emptyLine }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof BillLineForm, value: string | boolean) => {
    const updated = [...lines];
    (updated[idx] as unknown as Record<string, string | boolean>)[field] = value;
    setLines(updated);
  };

  const onSubmit = async (data: BillFormData) => {
    try {
      await createBill.mutateAsync({
        ...data,
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxAmount: l.taxAmount,
          hsnCode: l.hsnCode || undefined,
          accountId: l.accountId || undefined,
          itcEligible: l.itcEligible,
          itcBlockReason: l.itcBlockReason || undefined,
          rcmApplicable: l.rcmApplicable,
        })),
      });
      toast.success('Bill created successfully');
      router.push('/finance/bills');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create bill');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/finance" className="hover:text-foreground">Finance</Link>
          <span>{'\u203A'}</span>
          <Link href="/finance/bills" className="hover:text-foreground">Bills</Link>
          <span>{'\u203A'}</span>
          <span>New</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Bill</h1>
            <p className="text-sm text-muted-foreground">Record a vendor bill</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Bill Information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select onValueChange={(v) => setValue('vendorId', v)}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorInvoiceNumber">Vendor Invoice #</Label>
              <Input id="vendorInvoiceNumber" placeholder="Vendor's invoice number" {...register('vendorInvoiceNumber')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date *</Label>
              <Input id="issueDate" type="date" {...register('issueDate', { required: 'Required' })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input id="dueDate" type="date" {...register('dueDate', { required: 'Required' })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tax Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rcmApplicable"
                checked={watchRcm}
                onCheckedChange={(c) => setValue('rcmApplicable', !!c)}
              />
              <Label htmlFor="rcmApplicable">Reverse Charge Mechanism (RCM) applicable</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 h-3 w-3" />Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((line, idx) => (
              <div key={idx} className="grid gap-3 md:grid-cols-6 items-end border-b pb-4 last:border-0">
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    placeholder="Item description"
                    value={line.description}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit Price</Label>
                  <Input
                    type="number"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tax</Label>
                  <Input
                    type="number"
                    value={line.taxAmount}
                    onChange={(e) => updateLine(idx, 'taxAmount', e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center space-x-1">
                    <Checkbox
                      id={`itc-${idx}`}
                      checked={line.itcEligible}
                      onCheckedChange={(c) => updateLine(idx, 'itcEligible', !!c)}
                    />
                    <Label htmlFor={`itc-${idx}`} className="text-xs">ITC</Label>
                  </div>
                  {lines.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(idx)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
                {!line.itcEligible && (
                  <div className="md:col-span-6">
                    <Label className="text-xs text-muted-foreground">ITC Block Reason</Label>
                    <Input
                      placeholder="Reason for blocking ITC"
                      value={line.itcBlockReason}
                      onChange={(e) => updateLine(idx, 'itcBlockReason', e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Input placeholder="Additional notes..." {...register('notes')} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || createBill.isPending}>
            {(isSubmitting || createBill.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Bill
          </Button>
        </div>
      </form>
    </div>
  );
}
