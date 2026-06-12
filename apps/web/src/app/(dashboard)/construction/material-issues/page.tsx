'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, PackageMinus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMaterialIssues, useApproveMaterialIssue } from '@/hooks/use-construction';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

export default function MaterialIssuesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: issues } = useMaterialIssues();
  const approveMutation = useApproveMaterialIssue();

  const filtered = (issues || []).filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.issueNumber.toLowerCase().includes(q) ||
      (i.issuedTo || '').toLowerCase().includes(q)
    );
  });

  const totalDraft = filtered.filter((i) => i.status === 'draft').length;
  const totalApproved = filtered.filter((i) => i.status === 'approved').length;
  const totalValue = filtered.reduce((s, i) => s + parseFloat(i.totalValue || '0'), 0);
  const approvedValue = filtered
    .filter((i) => i.status === 'approved')
    .reduce((s, i) => s + parseFloat(i.totalValue || '0'), 0);

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await approveMutation.mutateAsync(id);
      toast('Material issued — inventory reduced & job cost posted to Finance GL');
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
            <span>Material Issues</span>
          </div>
          <h1 className="text-2xl font-bold">Material Issues</h1>
          <p className="text-sm text-muted-foreground">
            Site material issues — approval reduces inventory stock &amp; posts job cost journal
          </p>
        </div>
        <Link href="/construction/material-issues/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> New Material Issue
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Issues</div>
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
            <div className="text-sm text-muted-foreground">Total Value Issued</div>
            <div className="text-2xl font-bold">₹{approvedValue.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search material issues..."
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issue #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issued To</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Value</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((issue) => (
                  <tr
                    key={issue.id}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/construction/material-issues/${issue.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{issue.issueNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{issue.issueDate}</td>
                    <td className="px-4 py-3">{issue.issuedTo || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      ₹{parseFloat(issue.totalValue || '0').toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[issue.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {issue.status === 'draft' && (
                        <Button
                          size="sm"
                          className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={(e) => handleApprove(e, issue.id)}
                          disabled={approveMutation.isPending}
                        >
                          <PackageMinus className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No material issues found.{' '}
                      <Link href="/construction/material-issues/new" className="text-primary underline">
                        Create the first material issue
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
