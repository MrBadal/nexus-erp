'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useSalaryRevisions,
  useCreateSalaryRevision,
  useDeleteSalaryRevision,
  type CreateSalaryRevisionPayload,
} from '@/hooks/use-salary-revisions';
import { useEmployees, type Employee } from '@/hooks/use-hr';
import { formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';

const ALL_EMPLOYEES = '__all__';

function employeeName(emp: Employee): string {
  return emp.name?.trim() || `${emp.firstName} ${emp.lastName}`.trim();
}

interface FormState {
  employeeId: string;
  effectiveDate: string;
  previousCtc: string;
  newCtc: string;
  reason: string;
}

function emptyForm(): FormState {
  return {
    employeeId: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    previousCtc: '',
    newCtc: '',
    reason: '',
  };
}

export default function SalaryRevisionsPage() {
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>(ALL_EMPLOYEES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data: employees } = useEmployees();
  const { data: revisions, isLoading } = useSalaryRevisions(
    filterEmployeeId === ALL_EMPLOYEES ? undefined : filterEmployeeId,
  );
  const createMutation = useCreateSalaryRevision();
  const deleteMutation = useDeleteSalaryRevision();

  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    (employees ?? []).forEach((e) => map.set(e.id, employeeName(e)));
    return map;
  }, [employees]);

  const handleOpenCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.employeeId) {
      toast.error('Employee is required');
      return;
    }
    if (!form.effectiveDate) {
      toast.error('Effective date is required');
      return;
    }
    if (!form.newCtc.trim() || Number.isNaN(Number(form.newCtc))) {
      toast.error('A valid new CTC is required');
      return;
    }

    const payload: CreateSalaryRevisionPayload = {
      employeeId: form.employeeId,
      effectiveDate: form.effectiveDate,
      previousCtc: form.previousCtc.trim() || undefined,
      newCtc: form.newCtc.trim(),
      reason: form.reason.trim() || undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Salary revision created');
        setDialogOpen(false);
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create salary revision')),
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this salary revision?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Salary revision deleted'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete salary revision')),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salary Revisions</h1>
          <p className="text-sm text-muted-foreground">
            Track CTC changes, increments, and revision history per employee.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_EMPLOYEES}>All employees</SelectItem>
              {(employees ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {employeeName(e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Revision
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Salary Revision</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rev-employee">Employee</Label>
                  <Select
                    value={form.employeeId}
                    onValueChange={(v) => setForm({ ...form, employeeId: v })}
                  >
                    <SelectTrigger id="rev-employee">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {(employees ?? []).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {employeeName(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rev-date">Effective Date</Label>
                  <Input
                    id="rev-date"
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) =>
                      setForm({ ...form, effectiveDate: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rev-prev">Previous CTC</Label>
                    <Input
                      id="rev-prev"
                      type="number"
                      step="0.01"
                      value={form.previousCtc}
                      onChange={(e) =>
                        setForm({ ...form, previousCtc: e.target.value })
                      }
                      placeholder="e.g. 800000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rev-new">New CTC</Label>
                    <Input
                      id="rev-new"
                      type="number"
                      step="0.01"
                      value={form.newCtc}
                      onChange={(e) =>
                        setForm({ ...form, newCtc: e.target.value })
                      }
                      placeholder="e.g. 950000"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rev-reason">Reason</Label>
                  <Textarea
                    id="rev-reason"
                    value={form.reason}
                    onChange={(e) =>
                      setForm({ ...form, reason: e.target.value })
                    }
                    rows={2}
                    placeholder="e.g. Annual increment, promotion…"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Saving…' : 'Create Revision'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revision History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : !revisions || revisions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No salary revisions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Effective Date</th>
                    <th className="py-2 pr-4 font-medium">Employee</th>
                    <th className="py-2 pr-4 font-medium">Previous CTC</th>
                    <th className="py-2 pr-4 font-medium">New CTC</th>
                    <th className="py-2 pr-4 font-medium">Change</th>
                    <th className="py-2 pr-4 font-medium">Reason</th>
                    <th className="py-2 pr-4 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {revisions.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 pr-4 font-mono">
                        {formatDate(r.effectiveDate)}
                      </td>
                      <td className="py-3 pr-4">
                        {employeeMap.get(r.employeeId) ?? r.employeeId}
                      </td>
                      <td className="py-3 pr-4">{r.previousCtc ?? '—'}</td>
                      <td className="py-3 pr-4 font-medium">{r.newCtc}</td>
                      <td className="py-3 pr-4">
                        {r.revisionPercent !== null &&
                        r.revisionPercent !== undefined ? (
                          <Badge
                            variant={
                              Number(r.revisionPercent) >= 0
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {Number(r.revisionPercent) >= 0 ? '+' : ''}
                            {r.revisionPercent}%
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {r.reason ?? '—'}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(r.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
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
