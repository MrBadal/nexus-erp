'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, PackageCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSiteGrns, useApproveSiteGrn } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function SiteGrnsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: grns } = useSiteGrns();
  const approveMutation = useApproveSiteGrn();

  const filtered = (grns || []).filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return g.grnNumber.toLowerCase().includes(q) || (g.supplierName || '').toLowerCase().includes(q);
  });

  const totalValue = filtered.reduce((s, g) => s + parseFloat(g.totalValue || '0'), 0);
  const pendingApproval = filtered.filter((g) => g.status === 'submitted').length;

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await approveMutation.mutateAsync(id);
      toast('Site GRN approved — inventory updated & accrual journal posted');
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
            <span>&rsaquo;</span><span>Site GRNs</span>
          </div>
          <h1 className="text-2xl font-bold">Site GRNs</h1>
          <p className="text-sm text-muted-foreground">
            Site goods receipts — approval updates inventory stock + posts accrual journal to Finance
          </p>
        </div>
        <Link href="/construction/site-grns/new">
          <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Site GRN</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total GRNs</div>
          <div className="text-2xl font-bold">{filtered.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Pending Approval</div>
          <div className="text-2xl font-bold text-amber-600">{pendingApproval}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Value Received</div>
          <div className="text-2xl font-bold">₹{totalValue.toLocaleString('en-IN')}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Approved</div>
          <div className="text-2xl font-bold text-emerald-600">{filtered.filter((g) => g.status === 'approved').length}</div>
        </CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search site GRNs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">GRN Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Supplier</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Challan No</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total Value</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((grn) => (
                  <tr key={grn.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/construction/site-grns/${grn.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs">{grn.grnNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{grn.grnDate}</td>
                    <td className="px-4 py-3">{grn.supplierName || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{grn.challanNumber || '—'}</td>
                    <td className="px-4 py-3 font-medium">₹{parseFloat(grn.totalValue || '0').toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[grn.status] || ''}`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {grn.status === 'submitted' && (
                        <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={(e) => handleApprove(e, grn.id)}>
                          <PackageCheck className="h-3 w-3 mr-1" />Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No site GRNs found.{' '}
                      <Link href="/construction/site-grns/new" className="text-primary underline">Create the first site GRN</Link>
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
