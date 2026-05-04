'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status-dot';
import { PageHeader } from '@/components/layout/page-header';
import {
  useReviewCycle,
  useUpdateReviewCycle,
  useCycleReport,
} from '@/hooks/use-performance';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  open: 'success',
  review: 'info',
  closed: 'danger',
};

const transitions: Record<string, Array<{ next: string; label: string }>> = {
  draft: [{ next: 'open', label: 'Open Cycle' }],
  open: [{ next: 'review', label: 'Move to Review' }],
  review: [{ next: 'closed', label: 'Close Cycle' }],
  closed: [],
};

export default function CycleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: cycle } = useReviewCycle(id);
  const { data: report } = useCycleReport(id);
  const updateCycle = useUpdateReviewCycle();

  if (!cycle) {
    return <div className="p-6 text-sm text-muted-foreground">Loading cycle...</div>;
  }

  const handleTransition = async (next: string) => {
    await updateCycle.mutateAsync({ id, status: next as 'draft' | 'open' | 'review' | 'closed' });
  };

  const next = transitions[cycle.status] ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={cycle.name}
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Performance', href: '/hr/performance' },
          { label: cycle.name },
        ]}
        actions={
          <div className="flex gap-2">
            {next.map((t) => (
              <Button key={t.next} onClick={() => handleTransition(t.next)} disabled={updateCycle.isPending}>
                {t.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="mt-2">
              <StatusDot status={statusVariant[cycle.status] || 'info'} label={cycle.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Period</div>
            <div className="mt-1 text-sm font-medium">
              {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Employees</div>
            <div className="mt-1 text-2xl font-semibold">{report?.summary.totalEmployees ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Reviews Submitted</div>
            <div className="mt-1 text-2xl font-semibold">{report?.summary.totalReviews ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Review Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {report && report.perEmployee.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Goals</th>
                    <th className="px-3 py-2">Avg Self</th>
                    <th className="px-3 py-2">Avg Manager</th>
                    <th className="px-3 py-2">Weighted Self</th>
                    <th className="px-3 py-2">Weighted Manager</th>
                    <th className="px-3 py-2">Self Review</th>
                    <th className="px-3 py-2">Manager Review</th>
                  </tr>
                </thead>
                <tbody>
                  {report.perEmployee.map((row) => (
                    <tr key={row.employeeId} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{row.employeeCode ?? '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        {row.goals.completed} / {row.goals.total}
                      </td>
                      <td className="px-3 py-2">
                        {row.goals.avgSelfRating !== null ? row.goals.avgSelfRating.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {row.goals.avgManagerRating !== null ? row.goals.avgManagerRating.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {row.goals.weightedSelfScore !== null ? row.goals.weightedSelfScore.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {row.goals.weightedManagerScore !== null ? row.goals.weightedManagerScore.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {row.reviews.self ? (
                          <StatusDot status="success" label="Submitted" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.reviews.manager ? (
                          <StatusDot status="success" label="Submitted" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No employees with goals or reviews in this cycle yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
