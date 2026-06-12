'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useContracts } from '@/hooks/use-construction';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  tendering: 'bg-blue-100 text-blue-700',
  awarded: 'bg-indigo-100 text-indigo-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-500',
  terminated: 'bg-red-100 text-red-700',
  on_hold: 'bg-amber-100 text-amber-700',
};

const contractTypeLabels: Record<string, string> = {
  lump_sum: 'Lump Sum',
  item_rate: 'Item Rate',
  cost_plus: 'Cost Plus',
  epc: 'EPC',
  turnkey: 'Turnkey',
  labour_only: 'Labour Only',
};

export default function ContractsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: contracts } = useContracts({ search: search || undefined });

  const filtered = (contracts || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.contractNumber.toLowerCase().includes(q) ||
      c.clientName.toLowerCase().includes(q)
    );
  });

  const totalValue = filtered.reduce((s, c) => s + parseFloat(c.contractValue || '0'), 0);
  const totalBilled = filtered.reduce((s, c) => s + parseFloat(c.totalBilled || '0'), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/construction" className="hover:text-foreground">Construction</Link>
            <span>&rsaquo;</span><span>Contracts</span>
          </div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-sm text-muted-foreground">Construction contracts with BOQ, billing & compliance</p>
        </div>
        <Link href="/construction/contracts/new">
          <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Contract</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Contracts</div>
          <div className="text-2xl font-bold">{filtered.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold text-emerald-600">{filtered.filter((c) => c.status === 'active').length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Value</div>
          <div className="text-2xl font-bold">₹{(totalValue / 10000000).toFixed(2)}Cr</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Billed</div>
          <div className="text-2xl font-bold text-blue-600">₹{(totalBilled / 10000000).toFixed(2)}Cr</div>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contracts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contract No</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Value</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Billed</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/construction/contracts/${c.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs">{c.contractNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.projectLocation}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.clientName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px]">{contractTypeLabels[c.contractType] || c.contractType}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">₹{parseFloat(c.contractValue).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-emerald-600">₹{parseFloat(c.totalBilled || '0').toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[c.status] || ''}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No contracts found.{' '}
                      <Link href="/construction/contracts/new" className="text-primary underline">Create the first contract</Link>
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
