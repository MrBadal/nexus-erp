'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  useOffboardingTemplates,
  useCreateOffboardingTemplate,
  useDeleteOffboardingTemplate,
  type OffboardingTemplate,
} from '@/hooks/use-offboarding';
import { Plus, Trash2 } from 'lucide-react';

interface TaskRow {
  title: string;
  description: string;
  defaultAssignee: 'hr' | 'manager' | 'employee' | 'it' | 'admin';
  dueDays: number;
  isMandatory: boolean;
}

const EMPTY_TASK: TaskRow = {
  title: '',
  description: '',
  defaultAssignee: 'hr',
  dueDays: 0,
  isMandatory: true,
};

export default function OffboardingTemplatesPage() {
  const { data: templates, isLoading } = useOffboardingTemplates();
  const createMutation = useCreateOffboardingTemplate();
  const deleteMutation = useDeleteOffboardingTemplate();

  const [showBuilder, setShowBuilder] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState<TaskRow[]>([{ ...EMPTY_TASK }]);

  const reset = () => {
    setName('');
    setDescription('');
    setTasks([{ ...EMPTY_TASK }]);
    setShowBuilder(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const validTasks = tasks.filter((t) => t.title.trim());
    await createMutation.mutateAsync({
      name,
      description: description || undefined,
      tasks: validTasks.map((t, idx) => ({
        sequence: idx,
        title: t.title,
        description: t.description || undefined,
        defaultAssignee: t.defaultAssignee,
        dueDays: t.dueDays,
        isMandatory: t.isMandatory,
      })),
    });
    reset();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Offboarding Templates"
        subtitle="Reusable checklists for departing employees"
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Offboarding', href: '/hr/offboarding' },
          { label: 'Templates' },
        ]}
        actions={
          !showBuilder && (
            <Button size="sm" onClick={() => setShowBuilder(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Template
            </Button>
          )
        }
      />
      <main className="flex-1 overflow-auto p-6">
        {showBuilder && (
          <Card className="mb-6">
            <CardContent className="space-y-4 p-4">
              <h2 className="text-base font-semibold">Build new template</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-name">Name</Label>
                  <Input
                    id="tpl-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Standard Exit"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="tpl-desc">Description</Label>
                  <Textarea
                    id="tpl-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tasks</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTasks((prev) => [...prev, { ...EMPTY_TASK }])}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add task
                  </Button>
                </div>
                <div className="space-y-2">
                  {tasks.map((t, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 items-center gap-2 rounded border p-2"
                    >
                      <Input
                        className="col-span-4"
                        placeholder="Task title"
                        value={t.title}
                        onChange={(e) =>
                          setTasks((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, title: e.target.value } : p,
                            ),
                          )
                        }
                      />
                      <select
                        className="col-span-3 h-9 rounded-md border bg-background px-2 text-sm"
                        value={t.defaultAssignee}
                        onChange={(e) =>
                          setTasks((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? {
                                    ...p,
                                    defaultAssignee: e.target.value as TaskRow['defaultAssignee'],
                                  }
                                : p,
                            ),
                          )
                        }
                      >
                        <option value="hr">HR</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Employee</option>
                        <option value="it">IT</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Input
                        type="number"
                        min={0}
                        className="col-span-2"
                        placeholder="Due days"
                        value={t.dueDays}
                        onChange={(e) =>
                          setTasks((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? { ...p, dueDays: Number(e.target.value) || 0 }
                                : p,
                            ),
                          )
                        }
                      />
                      <label className="col-span-2 flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={t.isMandatory}
                          onChange={(e) =>
                            setTasks((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, isMandatory: e.target.checked } : p,
                              ),
                            )
                          }
                        />
                        Mandatory
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="col-span-1"
                        onClick={() =>
                          setTasks((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={reset}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!name.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Saving…' : 'Create template'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading templates…</p>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(templates || []).map((tpl: OffboardingTemplate) => (
            <Card key={tpl.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{tpl.name}</p>
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground">{tpl.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this template?')) {
                        deleteMutation.mutate(tpl.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={`rounded px-2 py-0.5 ${
                      tpl.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'bg-muted'
                    }`}
                  >
                    {tpl.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span>·</span>
                  <span>{tpl.tasks?.length ?? 0} tasks</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
