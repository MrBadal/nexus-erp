'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusDot } from '@/components/ui/status-dot';
import { ArrowLeft, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import {
  useExitClearance,
  useUpdateExitClearance,
  useSettleExitClearance,
  useDeleteExitClearance,
} from '@/hooks/use-exit-clearance';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  in_progress: 'warning',
  cleared: 'info',
  settled: 'success',
  cancelled: 'danger',
};

const statusLabel: Record<string, string> = {
  in_progress: 'In Progress',
  cleared: 'Cleared',
  settled: 'Settled',
  cancelled: 'Cancelled',
};

const CHECKPOINTS: { key: ClearanceFlag; label: string; desc: string }[] = [
  { key: 'itCleared', label: 'IT', desc: 'Assets, accounts & access revoked' },
  { key: 'financeCleared', label: 'Finance', desc: 'Advances & dues reconciled' },
  { key: 'hrCleared', label: 'HR', desc: 'Documents & formalities done' },
  { key: 'adminCleared', label: 'Admin', desc: 'ID card, keys & facilities returned' },
  { key: 'managerCleared', label: 'Reporting Manager', desc: 'Handover completed' },
];

type ClearanceFlag =
  | 'itCleared'
  | 'financeCleared'
  | 'hrCleared'
  | 'adminCleared'
  | 'managerCleared';

export default function ExitClearanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: clearance, isLoading } = useExitClearance(id);
  const updateClearance = useUpdateExitClearance();
  const settleClearance = useSettleExitClearance();
  const deleteClearance = useDeleteExitClearance();

  const [gratuityAmount, setGratuityAmount] = useState('0');
  const [leaveEncashment, setLeaveEncashment] = useState('0');
  const [pendingSalary, setPendingSalary] = useState('0');
  const [bonusAmount, setBonusAmount] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [settledDate, setSettledDate] = useState('');
  const [settleNotes, setSettleNotes] = useState('');

  useEffect(() => {
    const s = clearance?.finalSettlement;
    if (s) {
      setGratuityAmount(s.gratuityAmount);
      setLeaveEncashment(s.leaveEncashment);
      setPendingSalary(s.pendingSalary);
      setBonusAmount(s.bonusAmount);
      setDeductions(s.deductions);
      setSettledDate(s.settledDate ?? '');
      setSettleNotes(s.notes ?? '');
    }
  }, [clearance?.finalSettlement]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!clearance) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Exit clearance not found</p>
      </div>
    );
  }

  const isSettled = clearance.status === 'settled';
  const isCancelled = clearance.status === 'cancelled';

  const netPayable =
    (parseFloat(gratuityAmount) || 0) +
    (parseFloat(leaveEncashment) || 0) +
    (parseFloat(pendingSalary) || 0) +
    (parseFloat(bonusAmount) || 0) -
    (parseFloat(deductions) || 0);

  const handleToggle = (key: ClearanceFlag, value: boolean) => {
    updateClearance.mutate(
      { id, data: { [key]: value } },
      {
        onSuccess: () => toast.success('Clearance updated'),
        onError: () => toast.error('Failed to update clearance'),
      },
    );
  };

  const handleSettle = () => {
    settleClearance.mutate(
      {
        id,
        data: {
          gratuityAmount,
          leaveEncashment,
          pendingSalary,
          bonusAmount,
          deductions,
          settledDate: settledDate || undefined,
          notes: settleNotes || undefined,
        },
      },
      {
        onSuccess: () => toast.success('Full & final settlement recorded'),
        onError: () => toast.error('Failed to settle'),
      },
    );
  };

  const handleDelete = () => {
    if (!confirm('Delete this exit clearance?')) return;
    deleteClearance.mutate(id, {
      onSuccess: () => {
        toast.success('Exit clearance deleted');
        router.push('/hr/exit-clearances');
      },
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hr/exit-clearances">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{clearance.employeeName || 'Exit Clearance'}</h1>
              <StatusDot
                status={statusVariant[clearance.status] || 'info'}
                label={statusLabel[clearance.status] || clearance.status}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {clearance.employeeCode ? `${clearance.employeeCode} · ` : ''}
              {clearance.reason || 'Exit Clearance & Full-and-Final Settlement'}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleteClearance.isPending}
        >
          <Trash2 className="mr-1.5 h-4 w-4" /> Delete
        </Button>
      </div>

      {/* Details */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold">Details</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Resignation Date</dt>
            <dd>{clearance.resignationDate ? formatDate(clearance.resignationDate) : '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Last Working Date</dt>
            <dd>{clearance.lastWorkingDate ? formatDate(clearance.lastWorkingDate) : '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Clearance checkpoints */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Clearance Checkpoints</h2>
        <div className="space-y-3">
          {CHECKPOINTS.map((cp) => (
            <label
              key={cp.key}
              className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/40"
            >
              <Checkbox
                checked={clearance[cp.key]}
                disabled={isSettled || isCancelled || updateClearance.isPending}
                onCheckedChange={(v) => handleToggle(cp.key, Boolean(v))}
              />
              <div>
                <div className="text-sm font-medium">{cp.label}</div>
                <div className="text-xs text-muted-foreground">{cp.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Full & Final Settlement */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Full &amp; Final Settlement</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Gratuity</Label>
            <Input
              type="number"
              value={gratuityAmount}
              disabled={isSettled || isCancelled}
              onChange={(e) => setGratuityAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Leave Encashment</Label>
            <Input
              type="number"
              value={leaveEncashment}
              disabled={isSettled || isCancelled}
              onChange={(e) => setLeaveEncashment(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Pending Salary</Label>
            <Input
              type="number"
              value={pendingSalary}
              disabled={isSettled || isCancelled}
              onChange={(e) => setPendingSalary(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bonus</Label>
            <Input
              type="number"
              value={bonusAmount}
              disabled={isSettled || isCancelled}
              onChange={(e) => setBonusAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deductions</Label>
            <Input
              type="number"
              value={deductions}
              disabled={isSettled || isCancelled}
              onChange={(e) => setDeductions(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Settled Date</Label>
            <Input
              type="date"
              value={settledDate}
              disabled={isSettled || isCancelled}
              onChange={(e) => setSettledDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            value={settleNotes}
            disabled={isSettled || isCancelled}
            onChange={(e) => setSettleNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-md bg-muted/50 p-4">
          <span className="text-sm font-medium text-muted-foreground">Net Payable</span>
          <span className="font-mono text-xl font-semibold">{formatCurrency(netPayable)}</span>
        </div>

        {!isCancelled && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSettle} disabled={isSettled || settleClearance.isPending}>
              <Wallet className="mr-1.5 h-4 w-4" />
              {isSettled ? 'Settled' : settleClearance.isPending ? 'Settling...' : 'Settle'}
            </Button>
          </div>
        )}
      </div>

      {clearance.notes && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap text-sm">{clearance.notes}</p>
        </div>
      )}
    </div>
  );
}
