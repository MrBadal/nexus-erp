'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown } from 'lucide-react';
import { useEmployees } from '@/hooks/use-hr';
import { downloadForm16 } from '@/hooks/use-hr-reports';

export default function Form16Page() {
  const [employeeId, setEmployeeId] = useState('');
  const [fy, setFy] = useState('2025-26');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: employees, isLoading } = useEmployees({ limit: 500 });

  const handleGenerate = async () => {
    if (!employeeId || !fy) return;
    setGenerating(true);
    setError(null);
    try {
      await downloadForm16(employeeId, fy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate Form 16');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Form 16 — Generate</h1>
        <p className="text-sm text-muted-foreground">
          Generate the income-tax Form 16 PDF for an employee for a fiscal year.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Parameters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : (
            <div className="space-y-1">
              <Label htmlFor="employee">Employee</Label>
              <select
                id="employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="h-9 w-full max-w-md rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select employee…</option>
                {(employees ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name || `${e.firstName} ${e.lastName}`} ({e.employeeId})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="fy">Fiscal Year</Label>
            <Input id="fy" value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2025-26" className="w-32" />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!employeeId || !fy || generating}
            className="gap-1.5"
          >
            <FileDown className="h-3.5 w-3.5" />
            {generating ? 'Generating…' : 'Generate PDF'}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
