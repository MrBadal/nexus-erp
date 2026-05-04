'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useOnboardingChecklist,
  useUpdateOnboardingTaskStatus,
  type OnboardingTaskStatus,
} from '@/hooks/use-onboarding';
import { Check, SkipForward, RotateCcw } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const TASK_STATUS_BADGE: Record<OnboardingTaskStatus, string> = {
  pending: 'bg-muted text-foreground',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  skipped: 'bg-muted text-muted-foreground',
};

export default function OnboardingChecklistDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading, error } = useOnboardingChecklist(id);
  const updateStatus = useUpdateOnboardingTaskStatus();

  const handleStatus = (taskId: string, status: OnboardingTaskStatus) => {
    updateStatus.mutate({ id: taskId, status });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Onboarding Checklist"
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Onboarding', href: '/hr/onboarding' },
          { label: 'Checklist' },
        ]}
      />
      <main className="flex-1 overflow-auto p-6">
        {error && (
          <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
            Failed to load checklist.
          </div>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {data && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Employee</p>
                    <p className="font-mono text-sm">{data.employeeId}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${STATUS_BADGE[data.status]}`}
                  >
                    {data.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
                  <div>
                    <p className="uppercase tracking-wide">Started</p>
                    <p className="text-foreground">
                      {data.startedAt
                        ? new Date(data.startedAt).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide">Completed</p>
                    <p className="text-foreground">
                      {data.completedAt
                        ? new Date(data.completedAt).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide">Tasks</p>
                    <p className="text-foreground">{data.tasks?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide">Done</p>
                    <p className="text-foreground">
                      {data.tasks?.filter((t) => t.status === 'done').length ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Tasks</h3>
              {(data.tasks ?? []).map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            #{task.sequence + 1}
                          </span>
                          <p className="font-medium">{task.title}</p>
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${TASK_STATUS_BADGE[task.status]}`}
                          >
                            {task.status}
                          </span>
                        </div>
                        {task.description && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        )}
                        {task.dueDate && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={task.status === 'done' ? 'default' : 'outline'}
                          onClick={() => handleStatus(task.id, 'done')}
                          disabled={updateStatus.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatus(task.id, 'skipped')}
                          disabled={updateStatus.isPending}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStatus(task.id, 'pending')}
                          disabled={updateStatus.isPending}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {data.tasks?.length === 0 && (
                <p className="text-sm text-muted-foreground">No tasks in this checklist.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
