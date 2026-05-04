'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useActiveCycleEss, useCreateMyGoal } from '@/hooks/use-performance';

export default function NewGoalPage() {
  const router = useRouter();
  const { data: activeCycle } = useActiveCycleEss();
  const create = useCreateMyGoal();

  const [title, setTitle] = useState('');
  const [weight, setWeight] = useState<number>(0);
  const [target, setTarget] = useState('');

  const handleSubmit = async () => {
    if (!activeCycle) {
      alert('No active cycle is open for goal creation.');
      return;
    }
    if (!title.trim()) return;
    await create.mutateAsync({
      cycleId: activeCycle.id,
      title: title.trim(),
      weight,
      target: target.trim() || undefined,
    });
    router.push('/ess/performance');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Goal</h1>
        <p className="text-sm text-muted-foreground">
          {activeCycle
            ? `Cycle: ${activeCycle.name}`
            : 'No active cycle — you cannot create a goal right now.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Improve API response time by 30%"
            />
          </div>
          <div>
            <Label htmlFor="weight">Weight (%)</Label>
            <Input
              id="weight"
              type="number"
              min={0}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="target">Target / Success Criteria</Label>
            <Textarea
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="p95 latency below 200ms by Q2 end"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={create.isPending || !title.trim() || !activeCycle}
            >
              {create.isPending ? 'Saving...' : 'Save Goal'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
