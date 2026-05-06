'use client';

import { useState } from 'react';
import { Briefcase, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useMyExperience,
  useCreateMyExperience,
  useUpdateMyExperience,
  useDeleteMyExperience,
  type EmployeeExperience,
} from '@/hooks/use-employee-experience';
import { formatDate } from '@/lib/utils';

interface FormState {
  companyName: string;
  title: string;
  fromDate: string;
  toDate: string;
  employmentType: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  companyName: '',
  title: '',
  fromDate: '',
  toDate: '',
  employmentType: '',
  description: '',
};

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'freelance', label: 'Freelance' },
];

export default function EssExperiencePage() {
  const { data, isLoading } = useMyExperience();
  const createMut = useCreateMyExperience();
  const updateMut = useUpdateMyExperience();
  const deleteMut = useDeleteMyExperience();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const entries = data ?? [];

  const startEdit = (e: EmployeeExperience) => {
    setEditingId(e.id);
    setShowForm(true);
    setForm({
      companyName: e.companyName,
      title: e.title,
      fromDate: e.fromDate,
      toDate: e.toDate ?? '',
      employmentType: e.employmentType ?? '',
      description: e.description ?? '',
    });
  };

  const cancel = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim() || !form.title.trim() || !form.fromDate) {
      toast.error('Company, title, and start date are required');
      return;
    }
    const payload = {
      companyName: form.companyName.trim(),
      title: form.title.trim(),
      fromDate: form.fromDate,
      toDate: form.toDate || undefined,
      employmentType: form.employmentType || undefined,
      description: form.description.trim() || undefined,
    };
    if (editingId) {
      updateMut.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast.success('Experience updated');
            cancel();
          },
          onError: (err: Error) => toast.error(err.message || 'Failed'),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success('Experience added');
          cancel();
        },
        onError: (err: Error) => toast.error(err.message || 'Failed'),
      });
    }
  };

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('Experience removed'),
      onError: (err: Error) => toast.error(err.message || 'Failed'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Work Experience</h1>
          <p className="text-sm text-muted-foreground">
            Capture your prior roles and tenures so HR has a full picture of
            your career.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add experience
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit experience entry' : 'Add experience entry'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Company *</Label>
                <Input
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyName: e.target.value }))
                  }
                  placeholder="e.g. Infosys Ltd."
                />
              </div>
              <div className="space-y-2">
                <Label>Title / Role *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label>From *</Label>
                <Input
                  type="date"
                  value={form.fromDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fromDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>To (leave blank if current)</Label>
                <Input
                  type="date"
                  value={form.toDate}
                  onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Employment Type</Label>
                <Select
                  value={form.employmentType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, employmentType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Key responsibilities, projects, achievements"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancel}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                >
                  {createMut.isPending || updateMut.isPending
                    ? 'Saving…'
                    : editingId
                      ? 'Save changes'
                      : 'Add entry'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All experience entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-6 w-6" />
              No experience entries yet. Add your first one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Company</th>
                    <th className="px-4 py-2">Period</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        <div className="font-medium">{e.title}</div>
                        {e.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {e.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">{e.companyName}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDate(e.fromDate)} –{' '}
                        {e.toDate ? formatDate(e.toDate) : 'Present'}
                      </td>
                      <td className="px-4 py-2 capitalize text-muted-foreground">
                        {e.employmentType ? e.employmentType.replace(/_/g, ' ') : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(e)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(e.id, `${e.title} @ ${e.companyName}`)}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
