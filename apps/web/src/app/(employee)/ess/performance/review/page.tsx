'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  useActiveCycleEss,
  useMyGoals,
  useUpdateMyGoal,
  useSubmitSelfReview,
  type PerformanceGoal,
} from '@/hooks/use-performance';

export default function SelfReviewPage() {
  const router = useRouter();
  const { data: activeCycle } = useActiveCycleEss();
  const { data: goalsData } = useMyGoals(
    activeCycle ? { cycleId: activeCycle.id } : undefined,
  );
  const goals = (goalsData as PerformanceGoal[] | undefined) ?? [];

  const updateGoal = useUpdateMyGoal();
  const submitReview = useSubmitSelfReview();

  const [overallRating, setOverallRating] = useState<number>(3);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [comments, setComments] = useState('');

  const [goalRatings, setGoalRatings] = useState<Record<string, { rating: number; achievement: string }>>({});

  const setGoalField = (id: string, patch: Partial<{ rating: number; achievement: string }>) => {
    setGoalRatings((prev) => ({
      ...prev,
      [id]: {
        rating: prev[id]?.rating ?? 3,
        achievement: prev[id]?.achievement ?? '',
        ...patch,
      },
    }));
  };

  if (activeCycle && activeCycle.status !== 'review') {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Self-review is only available when the cycle is in <strong>review</strong> state.
            Current status: <strong>{activeCycle.status}</strong>.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeCycle) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No active review cycle available.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    // Save goal-level self ratings.
    for (const goal of goals) {
      const r = goalRatings[goal.id];
      if (!r) continue;
      await updateGoal.mutateAsync({
        id: goal.id,
        selfRating: r.rating,
        achievement: r.achievement,
        status: 'completed',
      });
    }

    await submitReview.mutateAsync({
      cycleId: activeCycle.id,
      overallRating,
      responses: { strengths, improvements, comments },
    });

    router.push('/ess/performance');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Self-Review</h1>
        <p className="text-sm text-muted-foreground">
          Cycle: {activeCycle.name} ({activeCycle.status})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goal Achievement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.length === 0 && (
            <div className="text-sm text-muted-foreground">No goals to rate for this cycle.</div>
          )}
          {goals.map((goal) => {
            const cur = goalRatings[goal.id] ?? { rating: 3, achievement: '' };
            return (
              <div key={goal.id} className="rounded border p-3">
                <div className="mb-2 font-medium">{goal.title}</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <Label className="text-xs">Self Rating (1-5)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={cur.rating}
                      onChange={(e) => setGoalField(goal.id, { rating: Number(e.target.value) })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Achievement Notes</Label>
                    <Input
                      value={cur.achievement}
                      onChange={(e) => setGoalField(goal.id, { achievement: e.target.value })}
                      placeholder="What you delivered against this goal"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overall Self-Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="overall">Overall Rating (1-5)</Label>
            <Input
              id="overall"
              type="number"
              min={1}
              max={5}
              value={overallRating}
              onChange={(e) => setOverallRating(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="strengths">Strengths</Label>
            <Textarea
              id="strengths"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="What went well this period"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="improvements">Areas for Improvement</Label>
            <Textarea
              id="improvements"
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="What you'd like to improve"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="comments">Additional Comments</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitReview.isPending || updateGoal.isPending}
            >
              {submitReview.isPending ? 'Submitting...' : 'Submit Self-Review'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
