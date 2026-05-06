'use client';

import { useState } from 'react';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
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
  useMyFamily,
  useCreateMyFamily,
  useUpdateMyFamily,
  useDeleteMyFamily,
  EMPLOYEE_FAMILY_RELATIONSHIPS,
  EMPLOYEE_FAMILY_RELATIONSHIP_LABELS,
  type EmployeeFamily,
  type EmployeeFamilyRelationship,
} from '@/hooks/use-employee-family';
import { formatDate } from '@/lib/utils';

interface FormState {
  name: string;
  relationship: EmployeeFamilyRelationship;
  dateOfBirth: string;
  nominee: boolean;
  nomineeSharePercent: string;
  aadhaarNumber: string;
  contactPhone: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  relationship: 'spouse',
  dateOfBirth: '',
  nominee: false,
  nomineeSharePercent: '',
  aadhaarNumber: '',
  contactPhone: '',
  notes: '',
};

export default function EssFamilyPage() {
  const { data, isLoading } = useMyFamily();
  const createMut = useCreateMyFamily();
  const updateMut = useUpdateMyFamily();
  const deleteMut = useDeleteMyFamily();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const entries = data ?? [];

  const startEdit = (e: EmployeeFamily) => {
    setEditingId(e.id);
    setShowForm(true);
    setForm({
      name: e.name,
      relationship: e.relationship,
      dateOfBirth: e.dateOfBirth ?? '',
      nominee: e.nominee,
      nomineeSharePercent:
        e.nomineeSharePercent !== null ? String(e.nomineeSharePercent) : '',
      aadhaarNumber: e.aadhaarNumber ?? '',
      contactPhone: e.contactPhone ?? '',
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
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    let nomineeSharePercent: number | undefined;
    if (form.nomineeSharePercent.trim()) {
      nomineeSharePercent = Number(form.nomineeSharePercent);
      if (
        !Number.isInteger(nomineeSharePercent) ||
        nomineeSharePercent < 0 ||
        nomineeSharePercent > 100
      ) {
        toast.error('Nominee share must be 0–100');
        return;
      }
    }
    const aadhaar = form.aadhaarNumber.replace(/[\s-]/g, '');
    if (aadhaar && !/^[2-9][0-9]{11}$/.test(aadhaar)) {
      toast.error('Aadhaar must be 12 digits and not start with 0 or 1');
      return;
    }
    const payload = {
      name: form.name.trim(),
      relationship: form.relationship,
      dateOfBirth: form.dateOfBirth || undefined,
      nominee: form.nominee,
      nomineeSharePercent,
      aadhaarNumber: aadhaar || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      updateMut.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast.success('Family entry updated');
            cancel();
          },
          onError: (err: Error) => toast.error(err.message || 'Failed'),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success('Family entry added');
          cancel();
        },
        onError: (err: Error) => toast.error(err.message || 'Failed'),
      });
    }
  };

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('Entry removed'),
      onError: (err: Error) => toast.error(err.message || 'Failed'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Family & Nominee Details</h1>
          <p className="text-sm text-muted-foreground">
            Add family members and nominees for benefits, insurance, and
            statutory filings.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add member
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit family member' : 'Add family member'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship *</Label>
                <Select
                  value={form.relationship}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      relationship: v as EmployeeFamilyRelationship,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_FAMILY_RELATIONSHIPS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {EMPLOYEE_FAMILY_RELATIONSHIP_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPhone: e.target.value }))
                  }
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Aadhaar Number</Label>
                <Input
                  value={form.aadhaarNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, aadhaarNumber: e.target.value }))
                  }
                  placeholder="1234 5678 9012"
                  maxLength={14}
                />
              </div>
              <div className="space-y-2 md:col-span-2 rounded-md border bg-muted/20 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.nominee}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nominee: e.target.checked }))
                    }
                  />
                  This person is a nominee for my benefits
                </label>
                {form.nominee && (
                  <div className="space-y-2 pt-2">
                    <Label>Nominee share (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.nomineeSharePercent}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          nomineeSharePercent: e.target.value,
                        }))
                      }
                      placeholder="e.g. 50"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Anything else HR should know"
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
                      : 'Add member'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All family members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="h-6 w-6" />
              No family entries yet. Add your first one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Relationship</th>
                    <th className="px-4 py-2">Date of Birth</th>
                    <th className="px-4 py-2">Phone</th>
                    <th className="px-4 py-2">Nominee</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{e.name}</td>
                      <td className="px-4 py-2">
                        {EMPLOYEE_FAMILY_RELATIONSHIP_LABELS[e.relationship]}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {e.dateOfBirth ? formatDate(e.dateOfBirth) : '—'}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {e.contactPhone ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        {e.nominee ? (
                          <Badge variant="secondary">
                            Yes{e.nomineeSharePercent !== null
                              ? ` · ${e.nomineeSharePercent}%`
                              : ''}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
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
                          onClick={() => handleDelete(e.id, e.name)}
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
