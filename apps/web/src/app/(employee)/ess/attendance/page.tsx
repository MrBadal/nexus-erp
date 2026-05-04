'use client';

import * as React from 'react';
import { Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useEssAttendanceToday,
  useEssAttendanceHistory,
  useEssCheckIn,
  useEssCheckOut,
} from '@/hooks/use-ess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'present':
      return 'default';
    case 'late':
      return 'secondary';
    case 'half_day':
      return 'secondary';
    case 'absent':
      return 'destructive';
    case 'on_leave':
      return 'outline';
    default:
      return 'outline';
  }
}

export default function EssAttendancePage() {
  const { data: today, isLoading: loadingToday } = useEssAttendanceToday();

  const now = new Date();
  const fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const toDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: history, isLoading: loadingHistory } = useEssAttendanceHistory(
    fromDate,
    toDate,
  );

  const checkIn = useEssCheckIn();
  const checkOut = useEssCheckOut();

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync({});
      toast.success('Checked in');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e.response?.data?.message ?? e.message ?? 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut.mutateAsync({});
      toast.success('Checked out');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e.response?.data?.message ?? e.message ?? 'Check-out failed');
    }
  };

  const isCheckedIn = !!today?.checkIn && !today?.checkOut;
  const isCheckedOut = !!today?.checkOut;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Check in and out and view your monthly attendance history.
        </p>
      </div>

      {/* Today's status */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Clock className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Today</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingToday ? (
            <div className="h-10 animate-pulse rounded bg-muted" />
          ) : (
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="text-2xl font-semibold">
                    {formatTime(today?.checkIn ?? null)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="text-2xl font-semibold">
                    {formatTime(today?.checkOut ?? null)}
                  </p>
                </div>
              </div>
              <div>
                {!today && (
                  <Button onClick={handleCheckIn} disabled={checkIn.isPending}>
                    Check in
                  </Button>
                )}
                {isCheckedIn && (
                  <Button
                    variant="secondary"
                    onClick={handleCheckOut}
                    disabled={checkOut.isPending}
                  >
                    Check out
                  </Button>
                )}
                {isCheckedOut && (
                  <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
                    <CheckCircle2 className="h-3 w-3" />
                    Done for today
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Calendar className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">
            This Month ({fromDate.slice(0, 7)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No attendance records this month.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">{rec.date}</TableCell>
                    <TableCell>{formatTime(rec.checkIn)}</TableCell>
                    <TableCell>{formatTime(rec.checkOut)}</TableCell>
                    <TableCell>{rec.workingHours ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(rec.status)}>
                        {rec.status.replace('_', ' ')}
                      </Badge>
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
