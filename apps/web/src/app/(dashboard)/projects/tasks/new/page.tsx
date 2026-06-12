'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateProjectTask, useProjects } from '@/hooks/use-projects';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewTaskPage() {
  const router = useRouter();
  const createMutation = useCreateProjectTask();
  const { data: projectsData } = useProjects();

  const projectsList = (projectsData as { id: string; name?: string; projectCode?: string }[] | undefined) ?? [];

  const [taskTitle, setTaskTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit() {
    if (!taskTitle.trim()) {
      toast.error('Task title is required');
      return;
    }
    createMutation.mutate(
      {
        taskTitle: taskTitle.trim(),
        projectId: projectId || undefined,
        assignedTo: assignedTo.trim() || undefined,
        priority,
        dueDate: dueDate?.toISOString().split('T')[0],
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        description,
      },
      {
        onSuccess: (data) => {
          toast.success('Task created');
          const id = (data as { id?: string }).id;
          router.push(id ? `/projects/tasks/${id}` : '/projects/tasks');
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create task')),
      },
    );
  }

  return (
    <FormPage
      title="New Task"
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: 'Tasks', href: '/projects/tasks' },
        { label: 'New Task' },
      ]}
      backHref="/projects/tasks"
      primaryAction={{
        label: 'Create Task',
        onClick: handleSubmit,
        loading: createMutation.isPending,
      }}
    >
      <div className="space-y-6">
        <FormSection title="Task Details" columns={2}>
          <FormField label="Task Title" required className="col-span-2">
            <Input
              value={taskTitle ?? undefined}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task title"
            />
          </FormField>
          <FormField label="Project">
            <Select value={projectId} onValueChange={(v) => setProjectId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {projectsList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name ?? p.projectCode ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Assigned To">
            <Input
              value={assignedTo ?? undefined}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Employee name or ID"
            />
          </FormField>
          <FormField label="Priority">
            <Select value={priority} onValueChange={(v) => setPriority(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Due Date">
            <DatePicker value={dueDate ?? undefined} onChange={(d) => setDueDate(d)} />
          </FormField>
          <FormField label="Estimated Hours">
            <Input
              type="number"
              value={estimatedHours ?? undefined}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g., 8"
              min={0}
              step={0.5}
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={description ?? undefined}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description and acceptance criteria"
              rows={4}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
