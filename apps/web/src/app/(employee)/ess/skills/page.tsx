'use client';

import { useState } from 'react';
import { Sparkles, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  useMySkills,
  useCreateMySkill,
  useUpdateMySkill,
  useDeleteMySkill,
  EMPLOYEE_SKILL_PROFICIENCIES,
  EMPLOYEE_SKILL_PROFICIENCY_LABELS,
  type EmployeeSkill,
  type EmployeeSkillProficiency,
} from '@/hooks/use-employee-skills';
import { formatDate } from '@/lib/utils';

interface FormState {
  skill: string;
  category: string;
  proficiency: EmployeeSkillProficiency;
  yearsOfExperience: string;
  certificationName: string;
  certificationIssuer: string;
  certificationDate: string;
  certificationExpiresAt: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  skill: '',
  category: '',
  proficiency: 'intermediate',
  yearsOfExperience: '',
  certificationName: '',
  certificationIssuer: '',
  certificationDate: '',
  certificationExpiresAt: '',
  notes: '',
};

export default function EssSkillsPage() {
  const { data, isLoading } = useMySkills();
  const createMut = useCreateMySkill();
  const updateMut = useUpdateMySkill();
  const deleteMut = useDeleteMySkill();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const entries = data ?? [];

  const startEdit = (e: EmployeeSkill) => {
    setEditingId(e.id);
    setShowForm(true);
    setForm({
      skill: e.skill,
      category: e.category ?? '',
      proficiency: e.proficiency,
      yearsOfExperience: e.yearsOfExperience ?? '',
      certificationName: e.certificationName ?? '',
      certificationIssuer: e.certificationIssuer ?? '',
      certificationDate: e.certificationDate ?? '',
      certificationExpiresAt: e.certificationExpiresAt ?? '',
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
    if (!form.skill.trim()) {
      toast.error('Skill name is required');
      return;
    }
    if (form.yearsOfExperience.trim()) {
      const yrs = Number(form.yearsOfExperience);
      if (Number.isNaN(yrs) || yrs < 0 || yrs > 99) {
        toast.error('Years of experience must be a number between 0 and 99');
        return;
      }
    }
    const payload = {
      skill: form.skill.trim(),
      category: form.category.trim() || undefined,
      proficiency: form.proficiency,
      yearsOfExperience: form.yearsOfExperience.trim() || undefined,
      certificationName: form.certificationName.trim() || undefined,
      certificationIssuer: form.certificationIssuer.trim() || undefined,
      certificationDate: form.certificationDate || undefined,
      certificationExpiresAt: form.certificationExpiresAt || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      updateMut.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast.success('Skill updated');
            cancel();
          },
          onError: (err: Error) => toast.error(err.message || 'Failed'),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success('Skill added');
          cancel();
        },
        onError: (err: Error) => toast.error(err.message || 'Failed'),
      });
    }
  };

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('Skill removed'),
      onError: (err: Error) => toast.error(err.message || 'Failed'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Skills & Certifications</h1>
          <p className="text-sm text-muted-foreground">
            Showcase the skills you bring to the team and any certifications
            you have earned.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add skill
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit skill / certification' : 'Add skill / certification'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Skill *</Label>
                <Input
                  value={form.skill}
                  onChange={(e) => setForm((f) => ({ ...f, skill: e.target.value }))}
                  placeholder="e.g. TypeScript, AWS, Project Management"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="e.g. Frontend, Cloud, Soft skill"
                />
              </div>
              <div className="space-y-2">
                <Label>Proficiency *</Label>
                <Select
                  value={form.proficiency}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      proficiency: v as EmployeeSkillProficiency,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_SKILL_PROFICIENCIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {EMPLOYEE_SKILL_PROFICIENCY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  step="0.5"
                  value={form.yearsOfExperience}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, yearsOfExperience: e.target.value }))
                  }
                  placeholder="e.g. 4.5"
                />
              </div>
              <div className="space-y-2 md:col-span-2 rounded-md border bg-muted/20 p-3">
                <div className="text-sm font-medium">
                  Certification (optional)
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Certification Name</Label>
                    <Input
                      value={form.certificationName}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          certificationName: e.target.value,
                        }))
                      }
                      placeholder="e.g. AWS Solutions Architect"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issuer</Label>
                    <Input
                      value={form.certificationIssuer}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          certificationIssuer: e.target.value,
                        }))
                      }
                      placeholder="e.g. Amazon Web Services"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issued On</Label>
                    <Input
                      type="date"
                      value={form.certificationDate}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          certificationDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires On</Label>
                    <Input
                      type="date"
                      value={form.certificationExpiresAt}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          certificationExpiresAt: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Anything else worth mentioning"
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
                      : 'Add skill'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All skills</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-6 w-6" />
              No skills yet. Add your first one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-2">Skill</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Proficiency</th>
                    <th className="px-4 py-2">Years</th>
                    <th className="px-4 py-2">Certification</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{e.skill}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {e.category ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary">
                          {EMPLOYEE_SKILL_PROFICIENCY_LABELS[e.proficiency]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {e.yearsOfExperience ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {e.certificationName ? (
                          <div>
                            <div>{e.certificationName}</div>
                            {e.certificationIssuer && (
                              <div className="text-xs">
                                {e.certificationIssuer}
                              </div>
                            )}
                            {e.certificationExpiresAt && (
                              <div className="text-xs">
                                Expires {formatDate(e.certificationExpiresAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
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
                          onClick={() => handleDelete(e.id, e.skill)}
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
