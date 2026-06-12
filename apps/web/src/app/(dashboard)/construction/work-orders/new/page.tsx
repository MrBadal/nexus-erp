'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateConstructionWorkOrder, useContracts } from '@/hooks/use-construction';
import { toast } from 'sonner';

interface FormState {
  contractId: string;
  type: string;
  scopeOfWork: string;
  startDate: string;
  endDate: string;
  vendorName: string;
  vendorGstin: string;
  vendorPan: string;
  vendorType: string;
  orderValue: string;
  gstRate: string;
  retentionPercentage: string;
  tdsApplicable: boolean;
  notes: string;
}

const initialState: FormState = {
  contractId: '',
  type: '',
  scopeOfWork: '',
  startDate: '',
  endDate: '',
  vendorName: '',
  vendorGstin: '',
  vendorPan: '',
  vendorType: '',
  orderValue: '',
  gstRate: '18',
  retentionPercentage: '5',
  tdsApplicable: true,
  notes: '',
};

export default function NewWorkOrderPage() {
  const router = useRouter();
  const createWorkOrder = useCreateConstructionWorkOrder();
  const { data: contracts } = useContracts();
  const [form, setForm] = useState<FormState>(initialState);

  const set = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const tdsRate = form.vendorType === 'individual_huf' ? 1 : form.vendorType === 'company_firm' ? 2 : 0;

  const preview = useMemo(() => {
    const orderValue = parseFloat(form.orderValue || '0');
    const gstRate = parseFloat(form.gstRate || '0');
    const retentionPercentage = parseFloat(form.retentionPercentage || '0');

    const gstAmount = (orderValue * gstRate) / 100;
    const retentionAmount = (orderValue * retentionPercentage) / 100;
    const tdsAmount = form.tdsApplicable ? (orderValue * tdsRate) / 100 : 0;
    const netPayment = orderValue + gstAmount - retentionAmount - tdsAmount;

    return { orderValue, gstAmount, retentionAmount, tdsAmount, netPayment };
  }, [form.orderValue, form.gstRate, form.retentionPercentage, form.tdsApplicable, tdsRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.contractId || !form.scopeOfWork.trim() || !form.vendorName.trim() || !form.orderValue) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const payload = {
      contractId: form.contractId,
      type: form.type || undefined,
      scopeOfWork: form.scopeOfWork.trim(),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      vendorName: form.vendorName.trim(),
      vendorGstin: form.vendorGstin.trim() || undefined,
      vendorPan: form.vendorPan.trim() || undefined,
      vendorType: form.vendorType || undefined,
      orderValue: parseFloat(form.orderValue || '0').toString(),
      gstRate: parseFloat(form.gstRate || '18').toString(),
      retentionPercentage: parseFloat(form.retentionPercentage || '5').toString(),
      tdsApplicable: form.tdsApplicable,
      tdsRate: form.tdsApplicable ? tdsRate.toString() : '0',
      tdsSection: form.tdsApplicable ? '194C' : undefined,
      notes: form.notes.trim() || undefined,
    };

    createWorkOrder.mutate(payload, {
      onSuccess: () => {
        toast.success('Work order created successfully');
        router.push('/construction/work-orders');
      },
      onError: (err) => {
        toast.error(apiErrorMessage(err, 'Failed to create work order. Please try again.'));
      },
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/construction" className="hover:text-foreground">Construction</Link>
          <span>&rsaquo;</span>
          <Link href="/construction/work-orders" className="hover:text-foreground">Work Orders</Link>
          <span>&rsaquo;</span>
          <span>New Work Order</span>
        </div>
        <h1 className="text-2xl font-bold">New Work Order</h1>
        <p className="text-sm text-muted-foreground">
          Create a subcontractor / supplier work order — TDS u/s 194C auto-deducted on payment
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Work Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contractId">
                Contract <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.contractId}
                onValueChange={(val) => set('contractId', val)}
              >
                <SelectTrigger id="contractId">
                  <SelectValue placeholder="Select contract" />
                </SelectTrigger>
                <SelectContent>
                  {(contracts || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contractNumber} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Work Order Type</Label>
              <Select
                value={form.type}
                onValueChange={(val) => set('type', val)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subcontract">Subcontract</SelectItem>
                  <SelectItem value="supply">Supply</SelectItem>
                  <SelectItem value="labour">Labour</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="equipment_hire">Equipment Hire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scopeOfWork">
                Scope of Work <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="scopeOfWork"
                value={form.scopeOfWork}
                onChange={(e) => set('scopeOfWork', e.target.value)}
                placeholder="Describe the scope of work covered under this work order..."
                rows={4}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vendorName">
                Vendor Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vendorName"
                value={form.vendorName}
                onChange={(e) => set('vendorName', e.target.value)}
                placeholder="e.g. Rajesh Constructions Pvt. Ltd."
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vendorGstin">Vendor GSTIN</Label>
              <Input
                id="vendorGstin"
                value={form.vendorGstin}
                onChange={(e) => set('vendorGstin', e.target.value)}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">
                Format: 2-digit state code + 10-char PAN + 1Z + check digit (15 chars total)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vendorPan">Vendor PAN</Label>
              <Input
                id="vendorPan"
                value={form.vendorPan}
                onChange={(e) => set('vendorPan', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Format: ABCDE1234F — required for TDS deduction under Section 194C
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vendorType">Vendor Type</Label>
              <Select
                value={form.vendorType}
                onValueChange={(val) => set('vendorType', val)}
              >
                <SelectTrigger id="vendorType">
                  <SelectValue placeholder="Select vendor type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual_huf">Individual / HUF</SelectItem>
                  <SelectItem value="company_firm">Company / Firm / LLP</SelectItem>
                </SelectContent>
              </Select>
              {form.vendorType && (
                <p className="text-xs text-muted-foreground rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  {form.vendorType === 'individual_huf'
                    ? 'Individual / HUF: TDS @ 1% under Section 194C'
                    : 'Company / Firm / LLP: TDS @ 2% under Section 194C'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Terms</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="orderValue">
                Order Value (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="orderValue"
                type="number"
                min="0"
                step="0.01"
                value={form.orderValue}
                onChange={(e) => set('orderValue', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="gstRate">GST Rate (%)</Label>
                <Input
                  id="gstRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.gstRate}
                  onChange={(e) => set('gstRate', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="retentionPercentage">Retention (%)</Label>
                <Input
                  id="retentionPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.retentionPercentage}
                  onChange={(e) => set('retentionPercentage', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="tdsApplicable"
                checked={form.tdsApplicable}
                onCheckedChange={(checked) => set('tdsApplicable', checked === true)}
              />
              <Label htmlFor="tdsApplicable" className="cursor-pointer font-normal">
                TDS Applicable (Section 194C)
              </Label>
            </div>

            {form.tdsApplicable && form.vendorType && (
              <div className="grid gap-3 pl-7">
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  TDS Rate: <strong>{tdsRate}%</strong> (auto-calculated based on vendor type)
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tdsSection">TDS Section</Label>
                  <Input
                    id="tdsSection"
                    value="194C"
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                </div>
              </div>
            )}

            {/* Live Preview */}
            {parseFloat(form.orderValue || '0') > 0 && (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                <p className="font-semibold text-sm mb-3">Payment Preview</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Value</span>
                  <span className="font-medium">₹{preview.orderValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    GST ({parseFloat(form.gstRate || '0')}%)
                  </span>
                  <span className="text-emerald-700">+ ₹{preview.gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Retention ({parseFloat(form.retentionPercentage || '0')}%)
                  </span>
                  <span className="text-amber-700">− ₹{preview.retentionAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    TDS ({tdsRate}%)
                  </span>
                  <span className="text-red-700">− ₹{preview.tdsAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Estimated Net Payment</span>
                  <span>₹{preview.netPayment.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Any additional terms, conditions, or remarks..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/construction/work-orders">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createWorkOrder.isPending}>
            {createWorkOrder.isPending ? 'Creating...' : 'Create Work Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
