'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarDays, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useEssLeaveBalance,
  useEssLeaveApplications,
  useWithdrawEssLeave,
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

function statusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    case 'cancelled':
      return 'outline';
    default:
      return 'outline';
  }
}

export default function EssLeavePage() {
  const { data: balances, isLoading: loadingBalance } = useEssLeaveBalance();
  const { data: apps, isLoading: loadingApps } = useEssLeaveApplications();
  const withdraw = useWithdrawEssLeave();

  const handleWithdraw = async (id: string) => {
    if (!confirm('Withdraw this leave application?')) return;
    try {
      await withdraw.mutateAsync(id);
      toast.success('Leave application withdrawn');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e.response?.data?.message ?? e.message ?? 'Failed to withdraw');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Leave</h1>
          <p className="text-sm text-muted-foreground">
            Track your leave balance and history.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ess/leave/calendar">
            <Button variant="outline">Team calendar</Button>
          </Link>
          <Link href="/ess/leave/apply">
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Apply for leave
            </Button>
          </Link>
        </div>
      </div>

      {/* Balance cards */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Balance for FY {new Date().getFullYear()}
        </h2>
        {loadingBalance ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !balances || balances.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No leave allocations for this year. Contact HR to set up your
              entitlements.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {balances.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{b.leaveTypeName}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {b.remainingDays}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / {b.totalDays}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.usedDays} used
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <CalendarDays className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingApps ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !apps || apps.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              You haven't applied for any leave yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.leaveType}</TableCell>
                    <TableCell>{a.fromDate}</TableCell>
                    <TableCell>{a.toDate}</TableCell>
                    <TableCell className="text-right">{a.totalDays}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-muted-foreground">
                      {a.reason ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(a.status)}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWithdraw(a.id)}
                          disabled={withdraw.isPending}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Withdraw
                        </Button>
                      )}
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
