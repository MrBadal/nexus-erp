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
import { useCreateMaterialIssue, useContracts } from '@/hooks/use-construction';
import { toast } from 'sonner';

interface IssueLine {
  itemDescription: string;
  unit: string;
  quantityIssued: number;
  unitRate: number;
}

const today = new Date().toISOString().split('T')[0];

const emptyLine = (): IssueLine => ({
  itemDescription: '',
  unit: '',
  quantityIssued: 0,
  unitRate: 0,
});

function lineAmount(line: IssueLine): number {
  return line.quantityIssued > 0 && line.unitRate > 0
    ? line.quantityIssued * line.unitRate
    : 0;
}

export default function NewMaterialIssuePage() {
  const router = useRouter();
  const createIssue = useCreateMaterialIssue();
  const { data: contracts } = useContracts();

  const [contractId, setContractId] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [warehouseId, setWarehouseId] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<IssueLine[]>([emptyLine()]);

  const updateLine = <K extends keyof IssueLine>(index: number, field: K, value: IssueLine[K]) => {
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
    if (!warehouseId.trim()) {
      toast.error('Warehouse ID is required.');
      return;
    }
    if (lines.some((l) => !l.itemDescription.trim())) {
      toast.error('All lines must have an item description.');
      return;
    }

    const payload = {
      contractId,
      issueDate,
      warehouseId: warehouseId.trim(),
      issuedTo: issuedTo.trim() || undefined,
      notes: notes.trim() || undefined,
      totalValue: totalValue.toString(),
      lines: lines.map((l) => ({
        itemDescription: l.itemDescription.trim(),
        unit: l.unit.trim(),
        quantityIssued: l.quantityIssued,
        unitRate: l.unitRate,
        amount: lineAmount(l).toString(),
      })),
    };

    createIssue.mutate(payload, {
      onSuccess: () => {
        toast.success('Material Issue created successfully.');
        router.push('/construction/material-issues');
      },
      onError: (err) => {
        toast.error(apiErrorMessage(err, 'Failed to create Material Issue. Please try again.'));
      },
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/construction" className="hover:text-foreground">Construction</Link>
          <span>&rsaquo;</span>
          <Link href="/construction/material-issues" className="hover:text-foreground">Material Issues</Link>
          <span>&rsaquo;</span>
          <span>New</span>
        </div>
        <h1 className="text-2xl font-bold">New Material Issue</h1>
        <p className="text-sm text-muted-foreground">Issue materials from warehouse to the construction site</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Issue Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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

            <div className="grid gap-2">
              <Label htmlFor="issueDate">
                Issue Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="warehouseId">
                Warehouse ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="warehouseId"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                placeholder="e.g. WH-001"
                required
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="issuedTo">Issued To</Label>
              <Input
                id="issuedTo"
                value={issuedTo}
                onChange={(e) => setIssuedTo(e.target.value)}
                placeholder="e.g. Site Foreman / Sub-contractor name"
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Purpose of issue or any additional remarks..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Material Lines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Material Lines</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[32%]">Item Description</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[10%]">Unit</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[15%]">Qty Issued</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[15%]">Unit Rate (₹)</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[20%]">Amount (₹)</th>
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
                          placeholder="e.g. Cement (OPC 53)"
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={line.unit}
                          onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                          placeholder="Bags"
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={line.quantityIssued || ''}
                          onChange={(e) => updateLine(idx, 'quantityIssued', parseFloat(e.target.value || '0'))}
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
                    <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold">
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

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/construction/material-issues">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createIssue.isPending}>
            {createIssue.isPending ? 'Saving...' : 'Create Material Issue'}
          </Button>
        </div>
      </form>
    </div>
  );
}
