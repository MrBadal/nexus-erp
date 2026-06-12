'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  useRetentionPolicies,
  useCreateRetentionPolicy,
  useUpdateRetentionPolicy,
  type RetentionPolicy,
} from '@/hooks/use-retention';

const documentTypes = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'bill', label: 'Bill' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'payment', label: 'Payment' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'quotation', label: 'Quotation' },
];

function AddPolicyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateRetentionPolicy();
  const [form, setForm] = useState({
    documentType: '',
    retentionDays: '',
    autoArchive: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.documentType || !form.retentionDays) {
      toast.error('Document type and retention days are required');
      return;
    }
    try {
      await createMutation.mutateAsync({
        documentType: form.documentType,
        retentionDays: parseInt(form.retentionDays, 10),
        autoArchive: form.autoArchive,
      });
      toast.success('Retention policy created');
      onOpenChange(false);
      setForm({ documentType: '', retentionDays: '', autoArchive: false });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create policy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Retention Policy</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select
              value={form.documentType}
              onValueChange={(v) => setForm({ ...form, documentType: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="retentionDays">Retention Days *</Label>
            <Input
              id="retentionDays"
              type="number"
              placeholder="365"
              value={form.retentionDays}
              onChange={(e) => setForm({ ...form, retentionDays: e.target.value })}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoArchive"
              checked={form.autoArchive}
              onCheckedChange={(checked) =>
                setForm({ ...form, autoArchive: checked === true })
              }
            />
            <Label htmlFor="autoArchive">Auto-archive after retention period</Label>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Policy
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RetentionPoliciesPage() {
  const { data: policies, isLoading } = useRetentionPolicies();
  const updatePolicy = useUpdateRetentionPolicy();
  const [dialogOpen, setDialogOpen] = useState(false);

  const policyList = Array.isArray(policies) ? policies : [];

  const handleToggleActive = async (policy: RetentionPolicy) => {
    try {
      await updatePolicy.mutateAsync({
        id: policy.id,
        data: { isActive: !policy.isActive },
      });
      toast.success(`Policy ${policy.isActive ? 'deactivated' : 'activated'}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update policy');
    }
  };

  const docTypeLabel = (type: string) =>
    documentTypes.find((d) => d.value === type)?.label ??
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/settings" className="hover:text-foreground">Settings</Link>
          <span>&rsaquo;</span>
          <span>Retention Policies</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Retention Policies</h1>
            <p className="text-sm text-muted-foreground">
              Configure document retention periods and auto-archive settings
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Policy
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : policyList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">No retention policies configured</p>
              <p className="text-sm text-muted-foreground">
                Add policies to define how long documents are retained.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Type</TableHead>
                  <TableHead className="text-right">Retention Days</TableHead>
                  <TableHead>Auto-Archive</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policyList.map((policy: RetentionPolicy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">
                      {docTypeLabel(policy.documentType)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {policy.retentionDays}
                    </TableCell>
                    <TableCell>
                      {policy.autoArchive ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          policy.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(policy)}
                        disabled={updatePolicy.isPending}
                      >
                        {policy.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddPolicyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
