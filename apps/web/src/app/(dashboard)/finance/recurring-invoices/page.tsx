'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, PauseCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  useRecurringInvoices,
  useCreateRecurringInvoice,
  useDeactivateRecurringInvoice,
  type RecurringInvoiceTemplate,
  type CreateRecurringInvoiceData,
} from '@/hooks/use-recurring-invoices';
import { formatDate } from '@/lib/utils';

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half Yearly',
  annually: 'Annually',
};

function CreateTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateRecurringInvoice();
  const [form, setForm] = useState<CreateRecurringInvoiceData>({
    sourceInvoiceId: '',
    frequency: 'monthly',
    nextRunDate: '',
    endDate: undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sourceInvoiceId || !form.nextRunDate) {
      toast.error('Source Invoice ID and Next Run Date are required');
      return;
    }
    try {
      await createMutation.mutateAsync({
        ...form,
        endDate: form.endDate || undefined,
      });
      toast.success('Recurring invoice template created');
      onOpenChange(false);
      setForm({ sourceInvoiceId: '', frequency: 'monthly', nextRunDate: '', endDate: undefined });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Recurring Invoice Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sourceInvoiceId">Source Invoice ID *</Label>
            <Input
              id="sourceInvoiceId"
              placeholder="Enter invoice ID"
              value={form.sourceInvoiceId}
              onChange={(e) => setForm({ ...form, sourceInvoiceId: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Frequency *</Label>
            <Select
              value={form.frequency}
              onValueChange={(v) =>
                setForm({ ...form, frequency: v as CreateRecurringInvoiceData['frequency'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="half_yearly">Half Yearly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextRunDate">Next Run Date *</Label>
            <Input
              id="nextRunDate"
              type="date"
              value={form.nextRunDate}
              onChange={(e) => setForm({ ...form, nextRunDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date (optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={form.endDate ?? ''}
              onChange={(e) => setForm({ ...form, endDate: e.target.value || undefined })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Template
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RecurringInvoicesPage() {
  const { data: templates, isLoading } = useRecurringInvoices();
  const deactivateMutation = useDeactivateRecurringInvoice();
  const [dialogOpen, setDialogOpen] = useState(false);

  const templateList = Array.isArray(templates) ? templates : [];

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateMutation.mutateAsync(id);
      toast.success('Recurring invoice template deactivated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate template');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/finance" className="hover:text-foreground">Finance</Link>
          <span>&rsaquo;</span>
          <span>Recurring Invoices</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Recurring Invoices</h1>
            <p className="text-sm text-muted-foreground">
              Manage recurring invoice templates for automated invoice generation
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templateList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">No recurring invoice templates</p>
              <p className="text-sm text-muted-foreground">
                Create a template to automatically generate invoices on a schedule.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Invoice</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Run Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Total Generated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templateList.map((template: RecurringInvoiceTemplate) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <Link
                        href={`/finance/invoices/${template.sourceInvoiceId}`}
                        className="text-primary hover:underline text-sm"
                      >
                        View Source Invoice
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {frequencyLabels[template.frequency] ?? template.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(template.nextRunDate)}</TableCell>
                    <TableCell>
                      {template.endDate ? formatDate(template.endDate) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {template.totalGenerated}
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.lastGeneratedAt ? formatDate(template.lastGeneratedAt) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {template.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(template.id)}
                          disabled={deactivateMutation.isPending}
                        >
                          <PauseCircle className="mr-1 h-3.5 w-3.5" />
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

      <CreateTemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
