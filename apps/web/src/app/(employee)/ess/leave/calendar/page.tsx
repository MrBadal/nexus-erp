'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEssTeamCalendar } from '@/hooks/use-ess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function toMonthKey(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map((s) => parseInt(s, 10));
  const d = new Date(y, m - 1 + delta, 1);
  return toMonthKey(d.getFullYear(), d.getMonth() + 1);
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function buildMonthGrid(month: string): Array<Date | null> {
  const [y, m] = month.split('-').map((s) => parseInt(s, 10));
  const first = new Date(y, m - 1, 1);
  const startDay = first.getDay(); // 0=Sun
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateInRange(d: Date, fromIso: string, toIso: string): boolean {
  const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return dStr >= fromIso && dStr <= toIso;
}

export default function EssTeamCalendarPage() {
  const now = new Date();
  const [month, setMonth] = React.useState<string>(
    toMonthKey(now.getFullYear(), now.getMonth() + 1),
  );
  const { data, isLoading } = useEssTeamCalendar(month);

  const cells = buildMonthGrid(month);
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link
        href="/ess/leave"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to leave
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Team Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium">
              {monthLabel(month)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-72 animate-pulse rounded bg-muted" />
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {dayLabels.map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, idx) => {
                  if (!d) {
                    return (
                      <div
                        key={idx}
                        className="aspect-square rounded-md bg-muted/20"
                      />
                    );
                  }
                  const onLeave = (data ?? []).filter((entry) =>
                    dateInRange(d, entry.fromDate, entry.toDate),
                  );
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'aspect-square rounded-md border p-1.5 text-xs',
                        onLeave.length > 0 ? 'bg-amber-50' : 'bg-background',
                      )}
                    >
                      <div className="font-medium">{d.getDate()}</div>
                      <div className="mt-0.5 space-y-0.5">
                        {onLeave.slice(0, 2).map((entry) => (
                          <div
                            key={entry.id}
                            className={cn(
                              'truncate rounded px-1 text-[10px]',
                              entry.isMine
                                ? 'bg-primary text-primary-foreground'
                                : entry.status === 'approved'
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-amber-100 text-amber-800',
                            )}
                            title={`${entry.employeeName} (${entry.leaveTypeName})`}
                          >
                            {entry.employeeName.split(' ')[0]}
                          </div>
                        ))}
                        {onLeave.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{onLeave.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend / list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">On leave this month</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No team members on leave this month.
            </p>
          ) : (
            <ul className="divide-y">
              {data.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{entry.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.leaveTypeName} · {entry.fromDate} → {entry.toDate} (
                      {entry.totalDays}d)
                    </p>
                  </div>
                  <Badge
                    variant={entry.status === 'approved' ? 'default' : 'secondary'}
                  >
                    {entry.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
