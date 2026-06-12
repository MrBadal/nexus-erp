'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
// Using Dialog for confirmation since AlertDialog is not available
import {
  useLegalHolds,
  usePlaceLegalHold,
  useReleaseLegalHold,
  type LegalHold,
} from '@/hooks/use-retention';
import { formatDate } from '@/lib/utils';

const documentTypes = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'bill', label: 'Bill' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'payment', label: 'Payment' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'quotation', label: 'Quotation' },
];

function PlaceHoldDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const placeMutation = usePlaceLegalHold();
  const [form, setForm] = useState({
    documentType: '',
    documentId: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.documentType || !form.documentId || !form.reason) {
      toast.error('All fields are required');
      return;
    }
    try {
      await placeMutation.mutateAsync(form);
      toast.success('Legal hold placed');
      onOpenChange(false);
      setForm({ documentType: '', documentId: '', reason: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to place legal hold');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Place Legal Hold</DialogTitle>
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
            <Label htmlFor="documentId">Document ID *</Label>
            <Input
              id="documentId"
              placeholder="Enter document ID"
              value={form.documentId}
              onChange={(e) => setForm({ ...form, documentId: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Reason for legal hold"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={placeMutation.isPending}>
              {placeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Place Hold
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LegalHoldsPage() {
  const { data: holds, isLoading } = useLegalHolds();
  const releaseMutation = useReleaseLegalHold();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [releaseId, setReleaseId] = useState<string | null>(null);

  const holdList = Array.isArray(holds) ? holds : [];

  const handleRelease = async () => {
    if (!releaseId) return;
    try {
      await releaseMutation.mutateAsync(releaseId);
      toast.success('Legal hold released');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to release hold');
    } finally {
      setReleaseId(null);
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
          <span>Legal Holds</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Legal Holds</h1>
            <p className="text-sm text-muted-foreground">
              Place and manage legal holds on documents to prevent deletion or modification
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Place Hold
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : holdList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">No legal holds</p>
              <p className="text-sm text-muted-foreground">
                Place a legal hold to prevent documents from being modified or deleted.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Held At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Released At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdList.map((hold: LegalHold) => {
                  const isActive = !hold.releasedAt;
                  return (
                    <TableRow key={hold.id}>
                      <TableCell className="font-medium">
                        {docTypeLabel(hold.documentType)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{hold.reason}</TableCell>
                      <TableCell>{formatDate(hold.heldAt)}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                          {isActive ? 'Active' : 'Released'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hold.releasedAt ? formatDate(hold.releasedAt) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReleaseId(hold.id)}
                            disabled={releaseMutation.isPending}
                          >
                            <Unlock className="mr-1 h-3.5 w-3.5" />
                            Release
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PlaceHoldDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <Dialog open={!!releaseId} onOpenChange={(open) => !open && setReleaseId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Release Legal Hold</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to release this legal hold? The document will no longer be
            protected from modification or deletion.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setReleaseId(null)}>
              Cancel
            </Button>
            <Button onClick={handleRelease} disabled={releaseMutation.isPending}>
              {releaseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Release Hold
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
