'use client';

import Link from 'next/link';
import {
  Users,
  CalendarOff,
  ClipboardList,
  CheckCircle2,
  Cake,
  PartyPopper,
  Building2,
  Briefcase,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useHrDashboard } from '@/hooks/use-hr-dashboard';

function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export default function HrDashboardPage() {
  const { data, isLoading, isError } = useHrDashboard();

  const totalPendingApprovals =
    (data?.pendingLeaveApprovals ?? 0) +
    (data?.pendingExpenseApprovals ?? 0) +
    (data?.pendingRegularizationRequests ?? 0);

  const kpis = [
    {
      label: 'Active Employees',
      value: data?.totalActiveEmployees ?? 0,
      icon: Users,
      accent: 'text-blue-600',
    },
    {
      label: 'On Leave Today',
      value: data?.onLeaveToday ?? 0,
      icon: CalendarOff,
      accent: 'text-amber-600',
    },
    {
      label: 'Attendance % (MTD)',
      value: `${data?.attendancePctCurrentMonth ?? 0}%`,
      icon: CheckCircle2,
      accent: 'text-emerald-600',
    },
    {
      label: 'Pending Approvals',
      value: totalPendingApprovals,
      icon: ClipboardList,
      accent: 'text-rose-600',
    },
  ];

  const maxDeptCount = Math.max(1, ...(data?.departmentDistribution ?? []).map((d) => d.count));
  const totalGender =
    (data?.genderRatio?.male ?? 0) +
    (data?.genderRatio?.female ?? 0) +
    (data?.genderRatio?.other ?? 0) +
    (data?.genderRatio?.unspecified ?? 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HR Overview</h1>
          <p className="text-sm text-muted-foreground">
            Operational view of headcount, attendance, approvals, and hiring.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/hr/employees">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Employees
            </Button>
          </Link>
          <Link href="/hr/leave">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" /> Approvals
            </Button>
          </Link>
        </div>
      </div>

      {isError ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            Could not load HR dashboard. Try refreshing the page.
          </CardContent>
        </Card>
      ) : null}

      {/* Top: KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${kpi.accent}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{kpi.value}</div>
                )}
                {!isLoading && kpi.label === 'Pending Approvals' && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {data?.pendingLeaveApprovals ?? 0} leave · {data?.pendingExpenseApprovals ?? 0} expense
                    {(data?.pendingRegularizationRequests ?? 0) > 0
                      ? ` · ${data?.pendingRegularizationRequests} reg.`
                      : ''}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Middle row: birthdays/anniversaries + recent hires/exits */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Celebrations</CardTitle>
            <Link href="/hr/employees">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Cake className="h-3.5 w-3.5" /> Birthdays (next 7 days)
                  </div>
                  {(data?.upcomingBirthdays ?? []).length === 0 ? (
                    <p className="py-2 text-xs text-muted-foreground">No birthdays in the next 7 days.</p>
                  ) : (
                    <div className="space-y-0">
                      {data!.upcomingBirthdays.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between border-b py-2 last:border-0"
                        >
                          <div>
                            <div className="text-sm font-medium">{b.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {b.department ?? 'Unassigned'}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {formatDaysUntil(b.daysUntil)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <PartyPopper className="h-3.5 w-3.5" /> Work Anniversaries (next 7 days)
                  </div>
                  {(data?.upcomingWorkAnniversaries ?? []).length === 0 ? (
                    <p className="py-2 text-xs text-muted-foreground">
                      No work anniversaries in the next 7 days.
                    </p>
                  ) : (
                    <div className="space-y-0">
                      {data!.upcomingWorkAnniversaries.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between border-b py-2 last:border-0"
                        >
                          <div>
                            <div className="text-sm font-medium">{a.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {a.yearsCompleted} year{a.yearsCompleted === 1 ? '' : 's'} ·{' '}
                              {a.department ?? 'Unassigned'}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {formatDaysUntil(a.daysUntil)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Headcount Movement (last 30 days)</CardTitle>
            <Link href="/hr/employees">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View Employees <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> New Hires
                    </div>
                    <div className="mt-1 text-2xl font-bold">{data?.newHiresLast30Days ?? 0}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingDown className="h-3.5 w-3.5 text-rose-600" /> Exits
                    </div>
                    <div className="mt-1 text-2xl font-bold">{data?.exitsLast30Days ?? 0}</div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Gender Ratio (Active)
                  </div>
                  {totalGender === 0 ? (
                    <p className="py-2 text-xs text-muted-foreground">
                      No data yet. Add gender on employee profiles to see this breakdown.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(
                        [
                          { key: 'male', label: 'Male', color: 'bg-blue-500' },
                          { key: 'female', label: 'Female', color: 'bg-pink-500' },
                          { key: 'other', label: 'Other', color: 'bg-purple-500' },
                          { key: 'unspecified', label: 'Unspecified', color: 'bg-gray-400' },
                        ] as const
                      ).map((g) => {
                        const v = data?.genderRatio?.[g.key] ?? 0;
                        const pct = totalGender > 0 ? Math.round((v / totalGender) * 100) : 0;
                        return (
                          <div key={g.key} className="flex items-center gap-3 text-xs">
                            <span className="w-20 text-muted-foreground">{g.label}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className={`h-full ${g.color}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-16 text-right tabular-nums">
                              {v} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: department distribution + open job openings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Department Distribution</CardTitle>
            </div>
            <Link href="/hr/departments">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Departments <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (data?.departmentDistribution ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No active employees yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Department breakdown will appear once employees are added.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {data!.departmentDistribution
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((d) => {
                    const pct = Math.round((d.count / maxDeptCount) * 100);
                    return (
                      <div
                        key={d.departmentId ?? 'unassigned'}
                        className="flex items-center gap-3 text-xs"
                      >
                        <span className="w-32 truncate text-sm">{d.name}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-sm tabular-nums">{d.count}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Open Job Openings</CardTitle>
            </div>
            <Link href="/hr/recruitment">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Recruitment <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (data?.openJobOpenings ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No open job openings</p>
                <p className="text-xs text-muted-foreground/70">
                  Create a job opening to start tracking applicants.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {data!.openJobOpenings.map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center justify-between border-b py-2.5 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium">{j.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {j.department ?? 'Unassigned'} · {j.filledPositions}/{j.positions} filled
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {j.applicantCount} applicant{j.applicantCount === 1 ? '' : 's'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
