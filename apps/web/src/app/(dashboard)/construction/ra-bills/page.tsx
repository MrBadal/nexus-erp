'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRaBills, useCertifyRaBill, useUpdateRaBillStatus } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-amber-100 text-amber-700',
  under_review: 'bg-orange-100 text-orange-700',
  certified: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  on_hold: 'bg-gray-100 text-gray-500',
};

export default function RaBillsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: bills } = useRaBills();
  const certifyMutation = useCertifyRaBill();
  const statusMutation = useUpdateRaBillStatus();

  const filtered = (bills || []).filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.billNumber.toLowerCase().includes(q);
  });

  const totalBilled = filtered.reduce((s, b) => s + parseFloat(b.currentBillAmount || '0'), 0);
  const pendingCertification = filtered.filter((b) => ['submitted', 'under_review'].includes(b.status)).length;

  const handleCertify = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await certifyMutation.mutateAsync({ id, certifiedBy: 'Site Engineer' });
      toast('RA Bill certified — AR invoice posted to Finance GL');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Certification failed'));
    }
  };

  const handleSubmit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await statusMutation.mutateAsync({ id, status: 'submitted' });
      toast('RA Bill submitted for review');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to submit'));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/construction" className="hover:text-foreground">Construction</Link>
            <span>&rsaquo;</span><span>RA Bills</span>
          </div>
          <h1 className="text-2xl font-bold">RA Bills</h1>
          <p className="text-sm text-muted-foreground">Running Account Bills — certification posts AR invoice + GL journal automatically</p>
        </div>
        <Link href="/construction/ra-bills/new">
          <Button className="gap-1.5"><Plus className="h-4 w-4" /> New RA Bill</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Bills</div>
          <div className="text-2xl font-bold">{filtered.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Pending Certification</div>
          <div className="text-2xl font-bold text-amber-600">{pendingCertification}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Billed</div>
          <div className="text-2xl font-bold">₹{totalBilled.toLocaleString('en-IN')}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Certified</div>
          <div className="text-2xl font-bold text-emerald-600">{filtered.filter((b) => ['certified', 'approved', 'paid'].includes(b.status)).length}</div>
        </CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search RA Bills..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bill No</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bill Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Current Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">GST</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Retention</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Net Payable</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bill) => (
                  <tr key={bill.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/construction/ra-bills/${bill.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs">{bill.billNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{bill.billDate}</td>
                    <td className="px-4 py-3 font-medium">₹{parseFloat(bill.currentBillAmount || '0').toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-muted-foreground">₹{parseFloat(bill.gstAmount || '0').toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-amber-600">₹{parseFloat(bill.retentionAmount || '0').toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">₹{parseFloat(bill.netPayable || '0').toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[bill.status] || ''}`}>
                        {bill.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {bill.status === 'draft' && (
                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => handleSubmit(e, bill.id)}>
                          Submit
                        </Button>
                      )}
                      {['submitted', 'under_review'].includes(bill.status) && (
                        <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={(e) => handleCertify(e, bill.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" />Certify
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No RA Bills found.{' '}
                      <Link href="/construction/ra-bills/new" className="text-primary underline">Create the first RA Bill</Link>
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
