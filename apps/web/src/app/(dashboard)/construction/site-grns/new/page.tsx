'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSiteGrn, useContracts } from '@/hooks/use-construction';
import { toast } from 'sonner';

interface GrnLine {
  itemDescription: string;
  unit: string;
  quantityReceived: number;
  quantityRejected: number;
  unitRate: number;
}

const today = new Date().toISOString().split('T')[0];

const emptyLine = (): GrnLine => ({
  itemDescription: '',
  unit: '',
  quantityReceived: 0,
  quantityRejected: 0,
  unitRate: 0,
});

function lineAmount(line: GrnLine): number {
  const net = line.quantityReceived - line.quantityRejected;
  return net > 0 ? net * line.unitRate : 0;
}

export default function NewSiteGrnPage() {
  const router = useRouter();
  const createGrn = useCreateSiteGrn();
  const { data: contracts } = useContracts();

  const [contractId, setContractId] = useState('');
  const [grnDate, setGrnDate] = useState(today);
  const [supplierName, setSupplierName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<GrnLine[]>([emptyLine()]);

  const updateLine = <K extends keyof GrnLine>(index: number, field: K, value: GrnLine[K]) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (index: number) => {
    setLines((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const totalValue = lines.reduce((sum, l) => sum + lineAmount(l), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contractId) {
      toast.error('Please select a contract.');
      return;
    }
    if (!supplierName.trim()) {
      toast.error('Supplier name is required.');
      return;
    }
    if (lines.some((l) => !l.itemDescription.trim())) {
      toast.error('All material lines must have an item description.');
      return;
    }

    const payload = {
      contractId,
      grnDate,
      supplierName: supplierName.trim(),
      vehicleNumber: vehicleNumber.trim() || undefined,
      challanNumber: challanNumber.trim() || undefined,
      warehouseId: warehouseId.trim() || undefined,
      notes: notes.trim() || undefined,
      totalValue: totalValue.toString(),
      lines: lines.map((l) => ({
        itemDescription: l.itemDescription.trim(),
        unit: l.unit.trim(),
        quantityReceived: l.quantityReceived,
        quantityRejected: l.quantityRejected,
        unitRate: l.unitRate,
        amount: lineAmount(l).toString(),
      })),
    };

    createGrn.mutate(payload, {
      onSuccess: () => {
        toast.success('Site GRN created successfully.');
        router.push('/construction/site-grns');
      },
      onError: (err) => {
        toast.error(apiErrorMessage(err, 'Failed to create Site GRN. Please try again.'));
      },
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/construction" className="hover:text-foreground">Construction</Link>
          <span>&rsaquo;</span>
          <Link href="/construction/site-grns" className="hover:text-foreground">Site GRNs</Link>
          <span>&rsaquo;</span>
          <span>New Site GRN</span>
        </div>
        <h1 className="text-2xl font-bold">New Site GRN</h1>
        <p className="text-sm text-muted-foreground">Record a goods receipt at the construction site</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GRN Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GRN Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {/* Contract */}
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="contractId">
                Contract <span className="text-destructive">*</span>
              </Label>
              <Select value={contractId} onValueChange={setContractId} required>
                <SelectTrigger id="contractId">
                  <SelectValue placeholder="Select a contract" />
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

            {/* GRN Date */}
            <div className="grid gap-2">
              <Label htmlFor="grnDate">
                GRN Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="grnDate"
                type="date"
                value={grnDate}
                onChange={(e) => setGrnDate(e.target.value)}
                required
              />
            </div>

            {/* Supplier Name */}
            <div className="grid gap-2">
              <Label htmlFor="supplierName">
                Supplier Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="supplierName"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Tata Steel Ltd"
                required
              />
            </div>

            {/* Vehicle / Challan No. */}
            <div className="grid gap-2">
              <Label htmlFor="vehicleNumber">Vehicle / Challan No.</Label>
              <Input
                id="vehicleNumber"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="MH-12-AB-1234"
              />
            </div>

            {/* Supplier Challan No. */}
            <div className="grid gap-2">
              <Label htmlFor="challanNumber">Supplier Challan No.</Label>
              <Input
                id="challanNumber"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="e.g. DC-2024-001"
              />
            </div>

            {/* Site Warehouse ID */}
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="warehouseId">Site Warehouse ID</Label>
              <Input
                id="warehouseId"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                placeholder="Leave blank to use default site store"
              />
              <p className="text-xs text-muted-foreground">Leave blank to use default site store</p>
            </div>
          </CardContent>
        </Card>

        {/* Material Lines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Material Lines</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Material
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[28%]">Item Description</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[10%]">Unit</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[13%]">Qty Received</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[13%]">Qty Rejected</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[14%]">Unit Rate (₹)</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[14%]">Amount (₹)</th>
                    <th className="px-3 py-2 w-[8%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-2">
                        <Input
                          value={line.itemDescription}
                          onChange={(e) => updateLine(idx, 'itemDescription', e.target.value)}
                          placeholder="e.g. TMT Steel Bars"
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={line.unit}
                          onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                          placeholder="MT"
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={line.quantityReceived || ''}
                          onChange={(e) => updateLine(idx, 'quantityReceived', parseFloat(e.target.value || '0'))}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={line.quantityRejected || ''}
                          onChange={(e) => updateLine(idx, 'quantityRejected', parseFloat(e.target.value || '0'))}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitRate || ''}
                          onChange={(e) => updateLine(idx, 'unitRate', parseFloat(e.target.value || '0'))}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        ₹{lineAmount(line).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={5} className="px-3 py-2 text-right text-sm font-semibold">
                      Total Value
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold tabular-nums">
                      ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional remarks about this delivery..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/construction/site-grns">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createGrn.isPending}>
            {createGrn.isPending ? 'Saving...' : 'Create Site GRN'}
          </Button>
        </div>
      </form>
    </div>
  );
}
