'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMeasurementBooks, useApproveMeasurementBook } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

export default function MeasurementBooksPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: mbs } = useMeasurementBooks();
  const approveMutation = useApproveMeasurementBook();

  const filtered = (mbs || []).filter((mb) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      mb.mbNumber.toLowerCase().includes(q) ||
      (mb.measuredBy || '').toLowerCase().includes(q) ||
      (mb.checkedBy || '').toLowerCase().includes(q)
    );
  });

  const totalDraft = filtered.filter((mb) => mb.status === 'draft').length;
  const totalApproved = filtered.filter((mb) => mb.status === 'approved').length;
  const totalValue = filtered.reduce((s, mb) => {
    const lineTotal = (mb.lines || []).reduce((ls, l) => ls + parseFloat(l.amount || '0'), 0);
    return s + lineTotal;
  }, 0);

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await approveMutation.mutateAsync(id);
      toast('Measurement Book approved');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Approval failed'));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/construction" className="hover:text-foreground">Construction</Link>
            <span>&rsaquo;</span>
            <span>Measurement Books</span>
          </div>
          <h1 className="text-2xl font-bold">Measurement Books</h1>
          <p className="text-sm text-muted-foreground">Record site measurements for BOQ items</p>
        </div>
        <Link href="/construction/measurement-books/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> New Measurement Book
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total MBs</div>
            <div className="text-2xl font-bold">{filtered.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Draft</div>
            <div className="text-2xl font-bold text-gray-600">{totalDraft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Approved</div>
            <div className="text-2xl font-bold text-emerald-600">{totalApproved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Value</div>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search measurement books..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">MB Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Measured By</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Checked By</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((mb) => (
                  <tr
                    key={mb.id}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/construction/measurement-books/${mb.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{mb.mbNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{mb.measurementDate}</td>
                    <td className="px-4 py-3">{mb.measuredBy || '—'}</td>
                    <td className="px-4 py-3">{mb.checkedBy || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[mb.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {mb.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {mb.status === 'draft' && (
                        <Button
                          size="sm"
                          className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={(e) => handleApprove(e, mb.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No measurement books found.{' '}
                      <Link href="/construction/measurement-books/new" className="text-primary underline">
                        Create the first measurement book
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
