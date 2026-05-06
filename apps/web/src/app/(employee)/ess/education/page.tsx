'use client';

import { useState } from 'react';
import { GraduationCap, Plus, Pencil, Trash2 } from 'lucide-react';
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
  useMyEducation,
  useCreateMyEducation,
  useUpdateMyEducation,
  useDeleteMyEducation,
  type EmployeeEducation,
} from '@/hooks/use-employee-education';

interface FormState {
  degree: string;
  institution: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  grade: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  degree: '',
  institution: '',
  fieldOfStudy: '',
  startYear: '',
  endYear: '',
  grade: '',
  notes: '',
};

export default function EssEducationPage() {
  const { data, isLoading } = useMyEducation();
  const createMut = useCreateMyEducation();
  const updateMut = useUpdateMyEducation();
  const deleteMut = useDeleteMyEducation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const entries = data ?? [];

  const startEdit = (e: EmployeeEducation) => {
    setEditingId(e.id);
    setShowForm(true);
    setForm({
      degree: e.degree,
      institution: e.institution,
      fieldOfStudy: e.fieldOfStudy ?? '',
      startYear: String(e.startYear),
      endYear: e.endYear ? String(e.endYear) : '',
      grade: e.grade ?? '',
      notes: e.notes ?? '',
    });
  };

  const cancel = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.degree.trim() || !form.institution.trim() || !form.startYear.trim()) {
      toast.error('Degree, institution, and start year are required');
      return;
    }
    const startYear = Number(form.startYear);
    if (!Number.isInteger(startYear) || startYear < 1900 || startYear > 2100) {
      toast.error('Start year must be between 1900 and 2100');
      return;
    }
    let endYear: number | undefined;
    if (form.endYear.trim()) {
      endYear = Number(form.endYear);
      if (!Number.isInteger(endYear) || endYear < 1900 || endYear > 2100) {
        toast.error('End year must be between 1900 and 2100');
        return;
      }
    }
    const payload = {
      degree: form.degree.trim(),
      institution: form.institution.trim(),
      fieldOfStudy: form.fieldOfStudy.trim() || undefined,
      startYear,
      endYear,
      grade: form.grade.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      updateMut.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast.success('Education updated');
            cancel();
          },
          onError: (err: Error) => toast.error(err.message || 'Failed to update'),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success('Education added');
          cancel();
        },
        onError: (err: Error) => toast.error(err.message || 'Failed to add'),
      });
    }
  };

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('Education removed'),
      onError: (err: Error) => toast.error(err.message || 'Failed to remove'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Education</h1>
          <p className="text-sm text-muted-foreground">
            Add the schools, colleges, and degrees that describe your academic
            background.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add education
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit education entry' : 'Add education entry'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Degree *</Label>
                <Input
                  value={form.degree}
                  onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))}
                  placeholder="e.g. B.Tech, MBA"
                />
              </div>
              <div className="space-y-2">
                <Label>Institution *</Label>
                <Input
                  value={form.institution}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, institution: e.target.value }))
                  }
                  placeholder="e.g. IIT Delhi"
                />
              </div>
              <div className="space-y-2">
                <Label>Field of Study</Label>
                <Input
                  value={form.fieldOfStudy}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fieldOfStudy: e.target.value }))
                  }
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input
                  value={form.grade}
                  onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                  placeholder="e.g. 8.5 CGPA / First Class"
                />
              </div>
              <div className="space-y-2">
                <Label>Start Year *</Label>
                <Input
                  type="number"
                  min={1900}
                  max={2100}
                  value={form.startYear}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startYear: e.target.value }))
                  }
                  placeholder="2018"
                />
              </div>
              <div className="space-y-2">
                <Label>End Year</Label>
                <Input
                  type="number"
                  min={1900}
                  max={2100}
                  value={form.endYear}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endYear: e.target.value }))
                  }
                  placeholder="2022 (leave blank if ongoing)"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Honors, projects, anything else worth noting"
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
          <CardTitle className="text-base">All education entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-6 w-6" />
              No education entries yet. Add your first one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-2">Degree</th>
                    <th className="px-4 py-2">Institution</th>
                    <th className="px-4 py-2">Field</th>
                    <th className="px-4 py-2">Years</th>
                    <th className="px-4 py-2">Grade</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{e.degree}</td>
                      <td className="px-4 py-2">{e.institution}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {e.fieldOfStudy ?? '—'}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {e.startYear} – {e.endYear ?? 'Present'}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {e.grade ?? '—'}
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
                          onClick={() => handleDelete(e.id, e.degree)}
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
