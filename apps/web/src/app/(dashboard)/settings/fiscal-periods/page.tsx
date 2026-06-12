'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  useFiscalPeriods,
  useCreateFiscalPeriod,
  useCloseFiscalPeriod,
  useReopenFiscalPeriod,
  useLockFiscalPeriod,
  type FiscalPeriod,
} from '@/hooks/use-fiscal-periods';
import { formatDate } from '@/lib/utils';

interface CreateFiscalPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateFiscalPeriodDialog({ open, onOpenChange }: CreateFiscalPeriodDialogProps) {
  const createPeriod = useCreateFiscalPeriod();
  const [form, setForm] = useState({
    name: '',
    type: 'month' as 'month' | 'quarter' | 'year',
    startDate: '',
    endDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error('Name, start date, and end date are required');
      return;
    }
    try {
      await createPeriod.mutateAsync(form);
      toast.success('Fiscal period created successfully');
      onOpenChange(false);
      setForm({ name: '', type: 'month', startDate: '', endDate: '' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create fiscal period';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create Fiscal Period</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="e.g. FY 2025-26" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v: 'month' | 'quarter' | 'year') => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input id="startDate" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input id="endDate" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createPeriod.isPending}>
              {createPeriod.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Period
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const MONTH_NAMES = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

export default function FiscalPeriodsPage() {
  const { data: periods, isLoading } = useFiscalPeriods();
  const closePeriod = useCloseFiscalPeriod();
  const reopenPeriod = useReopenFiscalPeriod();
  const lockPeriod = useLockFiscalPeriod();
  const createPeriod = useCreateFiscalPeriod();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const periodList = Array.isArray(periods) ? periods : [];

  const handleClose = async (id: string) => {
    try {
      await closePeriod.mutateAsync(id);
      toast.success('Fiscal period closed');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to close period';
      toast.error(message);
    }
  };

  const handleReopen = async (id: string) => {
    try {
      await reopenPeriod.mutateAsync(id);
      toast.success('Fiscal period reopened');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reopen period';
      toast.error(message);
    }
  };

  const handleLock = async (id: string) => {
    try {
      await lockPeriod.mutateAsync(id);
      toast.success('Fiscal period locked');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to lock period';
      toast.error(message);
    }
  };

  const handleGenerateFY = async () => {
    setGenerating(true);
    try {
      // Generate 12 monthly periods for Indian FY April 2025 - March 2026
      for (let i = 0; i < 12; i++) {
        const monthIndex = i;
        const year = monthIndex < 9 ? 2025 : 2026; // April-Dec = 2025, Jan-Mar = 2026
        const month = monthIndex < 9 ? monthIndex + 4 : monthIndex - 8; // April=4, ..., March=3
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

        // Calculate end date (last day of month)
        const endYear = month === 12 ? year + 1 : year;
        const endMonth = month === 12 ? 1 : month + 1;
        const lastDay = new Date(endYear, endMonth - 1, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        await createPeriod.mutateAsync({
          name: `${MONTH_NAMES[i]} ${year}`,
          type: 'month',
          startDate,
          endDate,
        });
      }
      toast.success('FY 2025-26 monthly periods generated successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate FY periods';
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'open': return 'success';
      case 'closed': return 'warning';
      case 'locked': return 'destructive';
      default: return 'secondary';
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'month': return 'Month';
      case 'quarter': return 'Quarter';
      case 'year': return 'Year';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/settings" className="hover:text-foreground">Settings</Link>
          <span>&rsaquo;</span>
          <span>Fiscal Periods</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fiscal Periods</h1>
            <p className="text-sm text-muted-foreground">
              Manage fiscal years, quarters, and monthly periods
            </p>
          </div>
          <div className="flex items-center gap-3">
            {periodList.length === 0 && !isLoading && (
              <Button variant="outline" onClick={handleGenerateFY} disabled={generating}>
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Calendar className="mr-2 h-4 w-4" />
                Generate FY 2025-26
              </Button>
            )}
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Fiscal Period
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
          ) : periodList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">No fiscal periods configured</p>
              <p className="text-sm text-muted-foreground">
                Click &quot;Generate FY 2025-26&quot; to auto-create 12 monthly periods for the Indian fiscal year, or create them manually.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodList.map((period: FiscalPeriod) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">{period.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabel(period.type)}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(period.startDate)}</TableCell>
                    <TableCell>{formatDate(period.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(period.status)}>
                        {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {period.status === 'open' && (
                          <Button variant="ghost" size="sm" onClick={() => handleClose(period.id)} disabled={closePeriod.isPending}>
                            Close
                          </Button>
                        )}
                        {period.status === 'closed' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleReopen(period.id)} disabled={reopenPeriod.isPending}>
                              Reopen
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleLock(period.id)} disabled={lockPeriod.isPending}>
                              Lock
                            </Button>
                          </>
                        )}
                        {period.status === 'locked' && (
                          <span className="text-xs text-muted-foreground">Locked</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateFiscalPeriodDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
