'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOffboardingKanban, type OffboardingChecklistStatus } from '@/hooks/use-offboarding';

const COLUMNS: { key: OffboardingChecklistStatus; label: string; tone: string }[] = [
  { key: 'pending', label: 'Pending', tone: 'border-amber-300 dark:border-amber-700' },
  { key: 'in_progress', label: 'In Progress', tone: 'border-blue-300 dark:border-blue-700' },
  { key: 'completed', label: 'Completed', tone: 'border-emerald-300 dark:border-emerald-700' },
  { key: 'overdue', label: 'Overdue', tone: 'border-red-300 dark:border-red-700' },
];

export default function OffboardingKanbanPage() {
  const { data, isLoading, error } = useOffboardingKanban();

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Offboarding"
        subtitle="Active exit checklists by status"
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Offboarding' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/hr/offboarding/templates">Templates</Link>
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-auto p-6">
        {error && (
          <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
            Failed to load offboarding kanban.
          </div>
        )}
        {isLoading && (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}
        {!isLoading && data && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const items = data[col.key] ?? [];
              return (
                <div
                  key={col.key}
                  className={`flex min-h-[200px] flex-col rounded-md border-2 ${col.tone} bg-muted/30 p-3`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{col.label}</h3>
                    <span className="rounded bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground">No checklists</p>
                    )}
                    {items.map((cl) => (
                      <Link
                        key={cl.id}
                        href={`/hr/offboarding/${cl.id}`}
                        className="block"
                      >
                        <Card className="cursor-pointer transition-colors hover:border-primary">
                          <CardContent className="p-3">
                            <p className="font-medium">
                              {cl.employeeFirstName} {cl.employeeLastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cl.employeeCode || '—'}
                            </p>
                            {cl.startedAt && (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Started{' '}
                                {new Date(cl.startedAt).toLocaleDateString()}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
