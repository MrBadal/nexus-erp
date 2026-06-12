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
import { useCreateMeasurementBook, useContracts } from '@/hooks/use-construction';
import { toast } from 'sonner';

const today = new Date().toISOString().split('T')[0];

export default function NewMeasurementBookPage() {
  const router = useRouter();
  const createMb = useCreateMeasurementBook();
  const { data: contracts } = useContracts();

  const [contractId, setContractId] = useState('');
  const [measurementDate, setMeasurementDate] = useState(today);
  const [measuredBy, setMeasuredBy] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contractId) {
      toast.error('Please select a contract.');
      return;
    }

    const payload = {
      contractId,
      measurementDate,
      measuredBy: measuredBy.trim() || undefined,
      checkedBy: checkedBy.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    createMb.mutate(payload, {
      onSuccess: () => {
        toast.success('Measurement Book created successfully.');
        router.push('/construction/measurement-books');
      },
      onError: (err) => {
        toast.error(apiErrorMessage(err, 'Failed to create Measurement Book. Please try again.'));
      },
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/construction" className="hover:text-foreground">Construction</Link>
          <span>&rsaquo;</span>
          <Link href="/construction/measurement-books" className="hover:text-foreground">Measurement Books</Link>
          <span>&rsaquo;</span>
          <span>New</span>
        </div>
        <h1 className="text-2xl font-bold">New Measurement Book</h1>
        <p className="text-sm text-muted-foreground">
          Create a measurement book. Lines can be added from the detail page after creation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Measurement Book Details</CardTitle>
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
              <Label htmlFor="measurementDate">
                Measurement Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="measurementDate"
                type="date"
                value={measurementDate}
                onChange={(e) => setMeasurementDate(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="measuredBy">Measured By</Label>
              <Input
                id="measuredBy"
                value={measuredBy}
                onChange={(e) => setMeasuredBy(e.target.value)}
                placeholder="e.g. Site Engineer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="checkedBy">Checked By</Label>
              <Input
                id="checkedBy"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                placeholder="e.g. Project Manager"
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any remarks or observations..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/construction/measurement-books">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createMb.isPending}>
            {createMb.isPending ? 'Saving...' : 'Create Measurement Book'}
          </Button>
        </div>
      </form>
    </div>
  );
}
