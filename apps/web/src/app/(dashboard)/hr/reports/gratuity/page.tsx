'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Play } from 'lucide-react';
import { useGratuityProvisions, useRunGratuityProvisioning } from '@/hooks/use-hr-reports';

export default function GratuityProvisionsPage() {
  const [fy, setFy] = useState('2025-26');
  const [filterFy, setFilterFy] = useState('');
  const { data: provisions, isLoading, isError } = useGratuityProvisions(filterFy || undefined);
  const runMutation = useRunGratuityProvisioning();

  const handleRun = () => {
    if (!fy) return;
    runMutation.mutate(fy);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Gratuity Provisioning</h1>
        <p className="text-sm text-muted-foreground">
          Compute and provision gratuity liability per fiscal year. Eligibility: ≥ 5 completed years of service.
          Formula: (Last Basic × 15 ÷ 26) × completed years.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Run Provisioning</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="fy">Fiscal Year</Label>
            <Input id="fy" value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2025-26" className="w-32" />
          </div>
          <Button onClick={handleRun} disabled={!fy || runMutation.isPending} className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            {runMutation.isPending ? 'Running…' : 'Run for FY'}
          </Button>

          {runMutation.data && (
            <div className="text-sm text-muted-foreground">
              Created: <span className="font-semibold text-foreground">{runMutation.data.created}</span>
              {' · '}Skipped: {runMutation.data.skipped}
              {' · '}Ineligible: {runMutation.data.ineligible}
            </div>
          )}
          {runMutation.isError && (
            <p className="text-sm text-destructive">Failed to run provisioning.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Provisions</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-fy" className="text-xs">Filter FY</Label>
              <Input
                id="filter-fy"
                value={filterFy}
                onChange={(e) => setFilterFy(e.target.value)}
                placeholder="all"
                className="h-8 w-28"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load provisions.</p>
          ) : !provisions || provisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No provisions yet. Run provisioning above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">Employee</th>
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">FY</th>
                    <th className="py-2 pr-3 text-right">Last Basic</th>
                    <th className="py-2 pr-3 text-right">Completed Years</th>
                    <th className="py-2 pr-3 text-right">Gratuity Amount</th>
                    <th className="py-2">Provided At</th>
                  </tr>
                </thead>
                <tbody>
                  {provisions.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2 pr-3">{p.employeeName || '—'}</td>
                      <td className="py-2 pr-3">{p.employeeCode}</td>
                      <td className="py-2 pr-3">{p.fiscalYear}</td>
                      <td className="py-2 pr-3 text-right">{Number(p.lastBasic).toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right">{Number(p.completedYears).toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right">{Number(p.gratuityAmount).toFixed(2)}</td>
                      <td className="py-2 text-xs text-muted-foreground">{new Date(p.providedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
