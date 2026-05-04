'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useEssLeaveBalance, useApplyEssLeave } from '@/hooks/use-ess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function diffInclusiveDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const f = new Date(from);
  const t = new Date(to);
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return 0;
  const ms = t.getTime() - f.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / 86400000) + 1;
}

export default function EssApplyLeavePage() {
  const router = useRouter();
  const { data: balances } = useEssLeaveBalance();
  const apply = useApplyEssLeave();

  const [leaveTypeId, setLeaveTypeId] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [reason, setReason] = React.useState('');

  const totalDays = diffInclusiveDays(fromDate, toDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId) {
      toast.error('Please select a leave type');
      return;
    }
    if (!fromDate || !toDate) {
      toast.error('Please pick from and to dates');
      return;
    }
    if (totalDays <= 0) {
      toast.error('To date must be on or after From date');
      return;
    }
    try {
      await apply.mutateAsync({
        leaveTypeId,
        fromDate,
        toDate,
        totalDays,
        reason: reason || undefined,
      });
      toast.success('Leave application submitted');
      router.push('/ess/leave');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        e.response?.data?.message ?? e.message ?? 'Failed to submit application',
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/ess/leave"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to leave
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Apply for Leave</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                <SelectTrigger id="leaveType">
                  <SelectValue placeholder="Select a leave type" />
                </SelectTrigger>
                <SelectContent>
                  {(balances ?? []).map((b) => (
                    <SelectItem key={b.leaveTypeId} value={b.leaveTypeId}>
                      {b.leaveTypeName} ({b.remainingDays} days remaining)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fromDate">From</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="toDate">To</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            {totalDays > 0 && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                Total days requested: <strong>{totalDays}</strong>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly explain the reason for your leave"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/ess/leave">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={apply.isPending}>
                {apply.isPending ? 'Submitting…' : 'Submit application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
