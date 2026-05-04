'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateKraTemplate, type KraItem } from '@/hooks/use-performance';

export default function NewKraTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [items, setItems] = useState<KraItem[]>([{ title: '', weight: 0, target: '' }]);
  const create = useCreateKraTemplate();

  const updateItem = (idx: number, patch: Partial<KraItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { title: '', weight: 0, target: '' }]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight || 0), 0);

  const handleSubmit = async () => {
    if (!name || items.length === 0) return;
    if (totalWeight > 100) {
      alert(`Total weight (${totalWeight}) exceeds 100`);
      return;
    }
    await create.mutateAsync({
      name,
      designationId: designationId || undefined,
      kras: items.filter((i) => i.title.trim()),
    });
    router.push('/hr/performance/templates');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New KRA Template"
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Performance', href: '/hr/performance' },
          { label: 'Templates', href: '/hr/performance/templates' },
          { label: 'New' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={create.isPending || !name || items.length === 0 || totalWeight > 100}
            >
              {create.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Software Engineer KRAs"
              />
            </div>
            <div>
              <Label htmlFor="designation">Designation ID (optional)</Label>
              <Input
                id="designation"
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                placeholder="UUID — leave blank for all designations"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>KRA Items</CardTitle>
          <div className="text-sm text-muted-foreground">
            Total weight: <span className={totalWeight > 100 ? 'text-destructive font-semibold' : 'font-semibold'}>{totalWeight}</span> / 100
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-3">
                <div className="col-span-5">
                  <Label className="text-xs">KRA Title</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => updateItem(idx, { title: e.target.value })}
                    placeholder="Code quality"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Weight (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={item.weight}
                    onChange={(e) => updateItem(idx, { weight: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Target</Label>
                  <Input
                    value={item.target}
                    onChange={(e) => updateItem(idx, { target: e.target.value })}
                    placeholder="< 5 critical bugs / quarter"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addItem} className="mt-3">
            <Plus className="mr-1 h-4 w-4" /> Add KRA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
