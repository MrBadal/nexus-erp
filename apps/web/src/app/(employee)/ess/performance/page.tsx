'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status-dot';
import { useActiveCycleEss, useMyGoals, type PerformanceGoal } from '@/hooks/use-performance';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  active: 'info',
  completed: 'success',
};

export default function EssPerformancePage() {
  const { data: activeCycle } = useActiveCycleEss();
  const { data: goalsData } = useMyGoals(
    activeCycle ? { cycleId: activeCycle.id } : undefined,
  );
  const goals = (goalsData as PerformanceGoal[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Performance</h1>
        <p className="text-sm text-muted-foreground">
          Manage your goals and submit your self-review.
        </p>
      </div>

      {activeCycle ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <div className="text-xs text-muted-foreground">Active Cycle</div>
              <div className="text-lg font-semibold">{activeCycle.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatDate(activeCycle.startDate)} – {formatDate(activeCycle.endDate)} ·{' '}
                <span className="capitalize">{activeCycle.status}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/ess/performance/goals/new">
                <Button>Add Goal</Button>
              </Link>
              {activeCycle.status === 'review' && (
                <Link href="/ess/performance/review">
                  <Button variant="outline">Submit Self-Review</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No active review cycle right now. HR will start one soon.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>My Goals</CardTitle>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              You have no goals for this cycle yet.
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{goal.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Weight: {goal.weight}% · Target: {goal.target ?? '-'}
                      </div>
                    </div>
                    <StatusDot status={statusVariant[goal.status] || 'info'} label={goal.status} />
                  </div>
                  {goal.achievement && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Achievement:</span> {goal.achievement}
                    </div>
                  )}
                  {(goal.selfRating || goal.managerRating) && (
                    <div className="mt-2 flex gap-4 text-xs">
                      <span>
                        Self: <strong>{goal.selfRating ?? '-'}/5</strong>
                      </span>
                      <span>
                        Manager: <strong>{goal.managerRating ?? '-'}/5</strong>
                      </span>
                    </div>
                  )}
                  {goal.managerComment && (
                    <div className="mt-2 rounded bg-muted/40 p-2 text-xs italic">
                      Manager: {goal.managerComment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
