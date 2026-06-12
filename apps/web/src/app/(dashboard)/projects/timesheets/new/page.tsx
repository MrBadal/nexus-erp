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
import { useCreateTimesheet, useProjects, useProjectTasks } from '@/hooks/use-projects';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewTimesheetPage() {
  const router = useRouter();
  const createMutation = useCreateTimesheet();

  const { data: projectsData } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const { data: tasksData } = useProjectTasks(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  const projectsList = (projectsData as { id: string; name?: string; projectCode?: string }[] | undefined) ?? [];
  const tasksList = (tasksData as { id: string; taskTitle?: string; name?: string }[] | undefined) ?? [];

  const [timesheetDate, setTimesheetDate] = useState<Date | null>(new Date());
  const [employeeId, setEmployeeId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [hours, setHours] = useState('');
  const [billable, setBillable] = useState('yes');
  const [notes, setNotes] = useState('');

  function handleProjectChange(v: string) {
    setSelectedProjectId(v);
    setTaskId('');
  }

  function handleSubmit() {
    if (!hours || parseFloat(hours) <= 0) {
      toast.error('Hours must be greater than 0');
      return;
    }
    createMutation.mutate(
      {
        timesheetDate: timesheetDate?.toISOString().split('T')[0],
        employeeId: employeeId.trim() || undefined,
        projectId: selectedProjectId || undefined,
        taskId: taskId || undefined,
        hours: parseFloat(hours),
        billable: billable === 'yes',
        notes,
      },
      {
        onSuccess: (data) => {
          toast.success('Timesheet entry created');
          const id = (data as { id?: string }).id;
          router.push(id ? `/projects/timesheets/${id}` : '/projects/timesheets');
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create timesheet entry')),
      },
    );
  }

  return (
    <FormPage
      title="New Timesheet Entry"
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: 'Timesheets', href: '/projects/timesheets' },
        { label: 'New Entry' },
      ]}
      backHref="/projects/timesheets"
      primaryAction={{
        label: 'Create Entry',
        onClick: handleSubmit,
        loading: createMutation.isPending,
      }}
    >
      <div className="space-y-6">
        <FormSection title="Timesheet Details" columns={2}>
          <FormField label="Date">
            <DatePicker value={timesheetDate ?? undefined} onChange={(d) => setTimesheetDate(d)} />
          </FormField>
          <FormField label="Employee">
            <Input
              value={employeeId ?? undefined}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Employee name or ID"
            />
          </FormField>
          <FormField label="Project">
            <Select value={selectedProjectId} onValueChange={handleProjectChange}>
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
          <FormField label="Task">
            <Select
              value={taskId}
              onValueChange={(v) => setTaskId(v)}
              disabled={!selectedProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select task (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {tasksList.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.taskTitle ?? t.name ?? t.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Hours" required>
            <Input
              type="number"
              value={hours ?? undefined}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g., 8"
              min={0}
              step={0.25}
            />
          </FormField>
          <FormField label="Billable">
            <Select value={billable} onValueChange={(v) => setBillable(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Notes" className="col-span-2">
            <Textarea
              value={notes ?? undefined}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you work on?"
              rows={4}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
