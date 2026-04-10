'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useTdsSections,
  useCreateTdsSection,
  useDeactivateTdsSection,
  useSeedTdsSections,
  type TdsSection,
} from '@/hooks/use-tds';

function AddSectionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createSection = useCreateTdsSection();
  const [form, setForm] = useState({
    section: '',
    description: '',
    rateIndividual: '',
    rateCompany: '',
    thresholdLimit: '',
    thresholdPeriod: 'annual' as 'annual' | 'per_transaction',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.section || !form.description) {
      toast.error('Section code and description are required');
      return;
    }
    try {
      await createSection.mutateAsync(form);
      toast.success('TDS section created successfully');
      onOpenChange(false);
      setForm({
        section: '',
        description: '',
        rateIndividual: '',
        rateCompany: '',
        thresholdLimit: '',
        thresholdPeriod: 'annual',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create TDS section';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add TDS Section</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="section">Section Code *</Label>
              <Input
                id="section"
                placeholder="e.g. 194C"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="Payment to contractors"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateIndividual">Rate - Individual (%)</Label>
              <Input
                id="rateIndividual"
                placeholder="1.00"
                value={form.rateIndividual}
                onChange={(e) => setForm({ ...form, rateIndividual: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateCompany">Rate - Company (%)</Label>
              <Input
                id="rateCompany"
                placeholder="2.00"
                value={form.rateCompany}
                onChange={(e) => setForm({ ...form, rateCompany: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thresholdLimit">Threshold Limit</Label>
              <Input
                id="thresholdLimit"
                placeholder="30000"
                value={form.thresholdLimit}
                onChange={(e) => setForm({ ...form, thresholdLimit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Threshold Period</Label>
              <Select
                value={form.thresholdPeriod}
                onValueChange={(value: 'annual' | 'per_transaction') =>
                  setForm({ ...form, thresholdPeriod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="per_transaction">Per Transaction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSection.isPending}>
              {createSection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Section
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TdsSectionsPage() {
  const { data: sections, isLoading } = useTdsSections();
  const deactivateSection = useDeactivateTdsSection();
  const seedDefaults = useSeedTdsSections();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateSection.mutateAsync(id);
      toast.success('TDS section deactivated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate section';
      toast.error(message);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await seedDefaults.mutateAsync();
      toast.success('Default TDS sections seeded successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to seed defaults';
      toast.error(message);
    }
  };

  const sectionList = Array.isArray(sections) ? sections : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/settings" className="hover:text-foreground">Settings</Link>
          <span>&rsaquo;</span>
          <span>TDS Sections</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">TDS Sections</h1>
            <p className="text-sm text-muted-foreground">
              Manage Tax Deducted at Source sections and rates
            </p>
          </div>
          <div className="flex items-center gap-3">
            {sectionList.length === 0 && !isLoading && (
              <Button
                variant="outline"
                onClick={handleSeedDefaults}
                disabled={seedDefaults.isPending}
              >
                {seedDefaults.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Download className="mr-2 h-4 w-4" />
                Seed Defaults
              </Button>
            )}
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Section
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
          ) : sectionList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">No TDS sections configured</p>
              <p className="text-sm text-muted-foreground">
                Click &quot;Seed Defaults&quot; to load standard Indian TDS sections, or add them manually.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Rate (Individual)</TableHead>
                  <TableHead className="text-right">Rate (Company)</TableHead>
                  <TableHead className="text-right">Threshold Limit</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionList.map((section: TdsSection) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.section}</TableCell>
                    <TableCell>{section.description}</TableCell>
                    <TableCell className="text-right">{section.rateIndividual}%</TableCell>
                    <TableCell className="text-right">{section.rateCompany}%</TableCell>
                    <TableCell className="text-right">
                      {section.thresholdLimit ? `₹${Number(section.thresholdLimit).toLocaleString('en-IN')}` : '-'}
                    </TableCell>
                    <TableCell className="capitalize">
                      {section.thresholdPeriod === 'per_transaction' ? 'Per Transaction' : 'Annual'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          section.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {section.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {section.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(section.id)}
                          disabled={deactivateSection.isPending}
                        >
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

      <AddSectionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
