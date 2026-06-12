'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateContract } from '@/hooks/use-construction';
import { toast } from 'sonner';

interface FormState {
  name: string;
  clientName: string;
  clientGstin: string;
  contractType: string;
  projectLocation: string;
  state: string;
  contractValue: string;
  gstRate: string;
  retentionPercentage: string;
  mobilisationAdvance: string;
  startDate: string;
  endDate: string;
  isReraApplicable: boolean;
  reraNumber: string;
  isBocwApplicable: boolean;
  notes: string;
}

const initialState: FormState = {
  name: '',
  clientName: '',
  clientGstin: '',
  contractType: '',
  projectLocation: '',
  state: '',
  contractValue: '',
  gstRate: '12',
  retentionPercentage: '5',
  mobilisationAdvance: '0',
  startDate: '',
  endDate: '',
  isReraApplicable: false,
  reraNumber: '',
  isBocwApplicable: false,
  notes: '',
};

export default function NewContractPage() {
  const router = useRouter();
  const createContract = useCreateContract();
  const [form, setForm] = useState<FormState>(initialState);

  const set = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.clientName.trim() || !form.contractValue) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      clientName: form.clientName.trim(),
      clientGstin: form.clientGstin.trim() || undefined,
      contractType: form.contractType || undefined,
      projectLocation: form.projectLocation.trim() || undefined,
      state: form.state.trim() || undefined,
      contractValue: parseFloat(form.contractValue || '0').toString(),
      gstRate: parseFloat(form.gstRate || '12').toString(),
      retentionPercentage: parseFloat(form.retentionPercentage || '5').toString(),
      mobilisationAdvance: parseFloat(form.mobilisationAdvance || '0').toString(),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      isReraApplicable: form.isReraApplicable,
      reraNumber: form.isReraApplicable ? form.reraNumber.trim() || undefined : undefined,
      isBocwApplicable: form.isBocwApplicable,
      notes: form.notes.trim() || undefined,
    };

    createContract.mutate(payload, {
      onSuccess: () => {
        toast.success('Contract created');
        router.push('/construction/contracts');
      },
      onError: (err) => {
        toast.error(apiErrorMessage(err, 'Failed to create contract. Please try again.'));
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
          <Link href="/construction/contracts" className="hover:text-foreground">Contracts</Link>
          <span>&rsaquo;</span>
          <span>New Contract</span>
        </div>
        <h1 className="text-2xl font-bold">New Contract</h1>
        <p className="text-sm text-muted-foreground">Create a new construction contract</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Contract Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Road Construction Project Phase 1"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientName">
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="clientName"
                value={form.clientName}
                onChange={(e) => set('clientName', e.target.value)}
                placeholder="e.g. Maharashtra PWD"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientGstin">Client GSTIN</Label>
              <Input
                id="clientGstin"
                value={form.clientGstin}
                onChange={(e) => set('clientGstin', e.target.value)}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contractType">Contract Type</Label>
              <Select
                value={form.contractType}
                onValueChange={(val) => set('contractType', val)}
              >
                <SelectTrigger id="contractType">
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lump_sum">Lump Sum</SelectItem>
                  <SelectItem value="item_rate">Item Rate</SelectItem>
                  <SelectItem value="cost_plus">Cost Plus</SelectItem>
                  <SelectItem value="epc">EPC</SelectItem>
                  <SelectItem value="turnkey">Turnkey</SelectItem>
                  <SelectItem value="labour_only">Labour Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectLocation">Project Location</Label>
              <Input
                id="projectLocation"
                value={form.projectLocation}
                onChange={(e) => set('projectLocation', e.target.value)}
                placeholder="e.g. Pune – Nashik Highway, NH-50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
                placeholder="Maharashtra"
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Terms</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="contractValue">
                Contract Value (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contractValue"
                type="number"
                min="0"
                step="0.01"
                value={form.contractValue}
                onChange={(e) => set('contractValue', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

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

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="mobilisationAdvance">Mobilisation Advance (₹)</Label>
              <Input
                id="mobilisationAdvance"
                type="number"
                min="0"
                step="0.01"
                value={form.mobilisationAdvance}
                onChange={(e) => set('mobilisationAdvance', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="isReraApplicable"
                checked={form.isReraApplicable}
                onCheckedChange={(checked) => set('isReraApplicable', checked === true)}
              />
              <Label htmlFor="isReraApplicable" className="cursor-pointer font-normal">
                RERA Applicable
              </Label>
            </div>

            {form.isReraApplicable && (
              <div className="grid gap-2 pl-7">
                <Label htmlFor="reraNumber">RERA Number</Label>
                <Input
                  id="reraNumber"
                  value={form.reraNumber}
                  onChange={(e) => set('reraNumber', e.target.value)}
                  placeholder="e.g. P52000012345"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <Checkbox
                id="isBocwApplicable"
                checked={form.isBocwApplicable}
                onCheckedChange={(checked) => set('isBocwApplicable', checked === true)}
              />
              <Label htmlFor="isBocwApplicable" className="cursor-pointer font-normal">
                BOCW Cess Applicable
              </Label>
            </div>
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
                placeholder="Any additional notes or special conditions..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/construction/contracts">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createContract.isPending}>
            {createContract.isPending ? 'Creating...' : 'Create Contract'}
          </Button>
        </div>
      </form>
    </div>
  );
}
