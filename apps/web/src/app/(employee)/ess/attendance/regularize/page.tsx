'use client';

import * as React from 'react';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useMyRegularizations,
  useRequestRegularization,
  type RegularizationStatus,
  type RequestedAttendanceStatus,
} from '@/hooks/use-attendance-regularization';

const REQUESTED_STATUS_OPTIONS: { value: RequestedAttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'late', label: 'Late' },
  { value: 'on_leave', label: 'On Leave' },
];

const REQUESTED_STATUS_LABELS: Record<RequestedAttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  half_day: 'Half Day',
  late: 'Late',
  on_leave: 'On Leave',
};

function statusBadgeVariant(
  status: RegularizationStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

export default function EssRegularizePage() {
  const { data: requests, isLoading } = useMyRegularizations();
  const request = useRequestRegularization();

  const [date, setDate] = React.useState('');
  const [requestedStatus, setRequestedStatus] =
    React.useState<RequestedAttendanceStatus | ''>('');
  const [checkIn, setCheckIn] = React.useState('');
  const [checkOut, setCheckOut] = React.useState('');
  const [reason, setReason] = React.useState('');

  const resetForm = () => {
    setDate('');
    setRequestedStatus('');
    setCheckIn('');
    setCheckOut('');
    setReason('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error('Please pick a date');
      return;
    }
    if (!requestedStatus) {
      toast.error('Please select the requested status');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await request.mutateAsync({
        date,
        requestedStatus,
        // datetime-local values are local; send as ISO so the API stores tz-aware
        requestedCheckIn: checkIn ? new Date(checkIn).toISOString() : undefined,
        requestedCheckOut: checkOut ? new Date(checkOut).toISOString() : undefined,
        reason: reason.trim(),
      });
      toast.success('Regularization request submitted');
      resetForm();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e.response?.data?.message ?? e.message ?? 'Failed to submit request');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance Regularization</h1>
        <p className="text-sm text-muted-foreground">
          Request a correction to your attendance for a specific day.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="requestedStatus">Requested Status</Label>
                <Select
                  value={requestedStatus}
                  onValueChange={(v) =>
                    setRequestedStatus(v as RequestedAttendanceStatus)
                  }
                >
                  <SelectTrigger id="requestedStatus">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUESTED_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="checkIn">Check In (optional)</Label>
                <Input
                  id="checkIn"
                  type="datetime-local"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="checkOut">Check Out (optional)</Label>
                <Input
                  id="checkOut"
                  type="datetime-local"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why your attendance needs correcting"
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={request.isPending}>
                {request.isPending ? 'Submitting…' : 'Submit request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <CalendarClock className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !requests || requests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              You haven't submitted any regularization requests yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Requested Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>
                      {REQUESTED_STATUS_LABELS[r.requestedStatus] ?? r.requestedStatus}
                    </TableCell>
                    <TableCell>{formatDateTime(r.requestedCheckIn)}</TableCell>
                    <TableCell>{formatDateTime(r.requestedCheckOut)}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {r.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
