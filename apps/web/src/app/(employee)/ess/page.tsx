'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Clock,
  CalendarDays,
  Wallet,
  Receipt,
  Bell,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useEssDashboard,
  useEssCheckIn,
  useEssCheckOut,
} from '@/hooks/use-ess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatINR(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(n)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPeriod(period: string): string {
  const [y, m] = period.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[parseInt(m, 10) - 1] ?? m} ${y}`;
}

export default function EssDashboardPage() {
  const { data, isLoading } = useEssDashboard();
  const checkIn = useEssCheckIn();
  const checkOut = useEssCheckOut();

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync({});
      toast.success('Checked in successfully');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e.response?.data?.message ?? e.message ?? 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut.mutateAsync({});
      toast.success('Checked out successfully');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e.response?.data?.message ?? e.message ?? 'Check-out failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border bg-background p-8 text-center text-muted-foreground">
        Could not load dashboard.
      </div>
    );
  }

  const today = data.todayAttendance;
  const isCheckedIn = !!today?.checkIn && !today?.checkOut;
  const isCheckedOut = !!today?.checkOut;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {getGreeting()}, {data.employee.firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back to your employee portal
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Top row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Today's attendance */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Today's Attendance
            </CardTitle>
            <Link
              href="/ess/attendance"
              className="text-xs text-primary hover:underline"
            >
              View history
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-6">
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
                    {checkIn.isPending ? 'Checking in…' : 'Check in'}
                  </Button>
                )}
                {isCheckedIn && (
                  <Button
                    variant="secondary"
                    onClick={handleCheckOut}
                    disabled={checkOut.isPending}
                  >
                    {checkOut.isPending ? 'Checking out…' : 'Check out'}
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
            {today?.status === 'late' && (
              <p className="mt-3 flex items-center gap-1 text-xs text-amber-700">
                <AlertCircle className="h-3 w-3" />
                Marked as late
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pending expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-primary" />
              Expenses
            </CardTitle>
            <Link
              href="/ess/expenses"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data.pendingExpenses}</p>
            <p className="text-xs text-muted-foreground">Pending claims</p>
            <Link href="/ess/expenses/new">
              <Button variant="outline" className="mt-3 w-full" size="sm">
                Submit claim
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Leave balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Leave Balance
          </CardTitle>
          <Link href="/ess/leave" className="text-xs text-primary hover:underline">
            Apply for leave
          </Link>
        </CardHeader>
        <CardContent>
          {data.leaveBalances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leave allocations yet for this fiscal year.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {data.leaveBalances.map((b) => (
                <div
                  key={b.leaveTypeCode}
                  className="rounded-md border bg-muted/40 p-3"
                >
                  <p className="text-xs text-muted-foreground">{b.leaveTypeName}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {b.remainingDays}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / {b.totalDays}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">days remaining</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Latest payslip */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-primary" />
              Latest Payslip
            </CardTitle>
            <Link
              href="/ess/payslips"
              className="text-xs text-primary hover:underline"
            >
              All payslips
            </Link>
          </CardHeader>
          <CardContent>
            {data.latestPayslip ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {formatPeriod(data.latestPayslip.period)}
                </p>
                <p className="text-3xl font-semibold">
                  {formatINR(data.latestPayslip.netPay)}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Gross: {formatINR(data.latestPayslip.grossPay)}</span>
                  <span>•</span>
                  <span>Status: {data.latestPayslip.status}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No payslips processed yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-primary" />
              Announcements
            </CardTitle>
            {data.unreadAnnouncements > 0 && (
              <Badge variant="secondary">{data.unreadAnnouncements} unread</Badge>
            )}
          </CardHeader>
          <CardContent>
            {data.unreadAnnouncements === 0 ? (
              <p className="text-sm text-muted-foreground">
                You're all caught up — no new announcements.
              </p>
            ) : (
              <p className="text-sm">
                You have {data.unreadAnnouncements} unread announcement
                {data.unreadAnnouncements > 1 ? 's' : ''}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
