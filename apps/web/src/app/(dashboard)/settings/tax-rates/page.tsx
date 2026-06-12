'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useTaxRates,
  useCreateTaxRate,
  useDeactivateTaxRate,
  type TaxRate,
} from '@/hooks/use-tax-rates';
import { formatDate } from '@/lib/utils';

const GST_DEFAULTS: Array<Partial<TaxRate>> = [
  { name: 'GST 5%', code: 'GST5', rate: '5', type: 'percentage', scope: 'both', isCompound: false, isInclusive: false },
  { name: 'GST 12%', code: 'GST12', rate: '12', type: 'percentage', scope: 'both', isCompound: false, isInclusive: false },
  { name: 'GST 18%', code: 'GST18', rate: '18', type: 'percentage', scope: 'both', isCompound: false, isInclusive: false },
  { name: 'GST 28%', code: 'GST28', rate: '28', type: 'percentage', scope: 'both', isCompound: false, isInclusive: false },
  { name: 'Exempt', code: 'EXEMPT', rate: '0', type: 'percentage', scope: 'both', isCompound: false, isInclusive: false },
  { name: 'GST 0.25%', code: 'GST025', rate: '0.25', type: 'percentage', scope: 'both', isCompound: false, isInclusive: false },
  { name: 'GST 3%', code: 'GST3', rate: '3', type: 'percentage', scope: 'both', isCompound: false, isInclusive: false },
];

interface AddTaxRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddTaxRateDialog({ open, onOpenChange }: AddTaxRateDialogProps) {
  const createTaxRate = useCreateTaxRate();
  const [form, setForm] = useState({
    name: '',
    code: '',
    rate: '',
    type: 'percentage' as 'percentage' | 'fixed',
    scope: 'both' as 'sales' | 'purchase' | 'both',
    isCompound: false,
    isInclusive: false,
    reportingCode: '',
    effectiveFrom: '',
    effectiveTo: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.rate) {
      toast.error('Name, code, and rate are required');
      return;
    }
    try {
      await createTaxRate.mutateAsync({
        ...form,
        reportingCode: form.reportingCode || null,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
      });
      toast.success('Tax rate created successfully');
      onOpenChange(false);
      setForm({
        name: '', code: '', rate: '', type: 'percentage', scope: 'both',
        isCompound: false, isInclusive: false, reportingCode: '', effectiveFrom: '', effectiveTo: '',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tax rate';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Tax Rate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="e.g. GST 18%" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" placeholder="e.g. GST18" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate *</Label>
              <Input id="rate" placeholder="18" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v: 'percentage' | 'fixed') => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={(v: 'sales' | 'purchase' | 'both') => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportingCode">Reporting Code</Label>
              <Input id="reportingCode" placeholder="Optional" value={form.reportingCode} onChange={(e) => setForm({ ...form, reportingCode: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Effective From</Label>
              <Input id="effectiveFrom" type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveTo">Effective To</Label>
              <Input id="effectiveTo" type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="isCompound" checked={form.isCompound} onCheckedChange={(v) => setForm({ ...form, isCompound: !!v })} />
              <Label htmlFor="isCompound" className="text-sm">Compound Tax</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="isInclusive" checked={form.isInclusive} onCheckedChange={(v) => setForm({ ...form, isInclusive: !!v })} />
              <Label htmlFor="isInclusive" className="text-sm">Tax Inclusive</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createTaxRate.isPending}>
              {createTaxRate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tax Rate
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TaxRatesPage() {
  const { data: taxRates, isLoading } = useTaxRates();
  const deactivate = useDeactivateTaxRate();
  const createTaxRate = useCreateTaxRate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const rateList = Array.isArray(taxRates) ? taxRates : [];

  const handleDeactivate = async (id: string) => {
    try {
      await deactivate.mutateAsync(id);
      toast.success('Tax rate deactivated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate';
      toast.error(message);
    }
  };

  const handleSeedGst = async () => {
    setSeeding(true);
    try {
      for (const gst of GST_DEFAULTS) {
        await createTaxRate.mutateAsync(gst);
      }
      toast.success('Indian GST defaults seeded successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to seed GST defaults';
      toast.error(message);
    } finally {
      setSeeding(false);
    }
  };

  const scopeVariant = (scope: string) => {
    switch (scope) {
      case 'sales': return 'default';
      case 'purchase': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/settings" className="hover:text-foreground">Settings</Link>
          <span>&rsaquo;</span>
          <span>Tax Rates</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tax Rates</h1>
            <p className="text-sm text-muted-foreground">
              Manage GST rates, tax codes, and compliance settings
            </p>
          </div>
          <div className="flex items-center gap-3">
            {rateList.length === 0 && !isLoading && (
              <Button variant="outline" onClick={handleSeedGst} disabled={seeding}>
                {seeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Download className="mr-2 h-4 w-4" />
                Seed Indian GST Defaults
              </Button>
            )}
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tax Rate
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rateList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">No tax rates configured</p>
              <p className="text-sm text-muted-foreground">
                Click &quot;Seed Indian GST Defaults&quot; to load standard GST rates, or add them manually.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Effective To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateList.map((rate: TaxRate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.name}</TableCell>
                    <TableCell>{rate.code}</TableCell>
                    <TableCell className="text-right">
                      {rate.rate}{rate.type === 'percentage' ? '%' : ''}
                    </TableCell>
                    <TableCell className="capitalize">{rate.type}</TableCell>
                    <TableCell>
                      <Badge variant={scopeVariant(rate.scope)}>{rate.scope}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rate.isActive ? 'success' : 'secondary'}>
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{rate.effectiveFrom ? formatDate(rate.effectiveFrom) : '-'}</TableCell>
                    <TableCell>{rate.effectiveTo ? formatDate(rate.effectiveTo) : '-'}</TableCell>
                    <TableCell className="text-right">
                      {rate.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(rate.id)} disabled={deactivate.isPending}>
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddTaxRateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
