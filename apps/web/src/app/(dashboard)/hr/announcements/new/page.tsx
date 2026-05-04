'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useCreateAnnouncement,
  type AnnouncementAudienceScope,
  type AnnouncementCreateInput,
} from '@/hooks/use-announcements';
import { useDepartments, useEmployees } from '@/hooks/use-hr';

interface FormState {
  title: string;
  body: string;
  audienceScope: AnnouncementAudienceScope;
  audienceIds: string[];
  publishedAt: string;
  expiresAt: string;
}

const initialFormState: FormState = {
  title: '',
  body: '',
  audienceScope: 'tenant',
  audienceIds: [],
  publishedAt: '',
  expiresAt: '',
};

const audienceOptions: { value: AnnouncementAudienceScope; label: string; description: string }[] = [
  { value: 'tenant', label: 'Everyone', description: 'All employees in the tenant' },
  { value: 'department', label: 'By department', description: 'Pick one or more departments' },
  { value: 'designation', label: 'By designation', description: 'Pick one or more designations' },
  { value: 'specific', label: 'Specific people', description: 'Pick individual employees' },
];

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const createAnnouncement = useCreateAnnouncement();

  const { data: departments } = useDepartments();
  const { data: employees } = useEmployees();

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const setAudienceScope = (scope: AnnouncementAudienceScope) => {
    setForm((prev) => ({ ...prev, audienceScope: scope, audienceIds: [] }));
  };

  const toggleAudienceId = (id: string) => {
    setForm((prev) => {
      const set = new Set(prev.audienceIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, audienceIds: Array.from(set) };
    });
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (!form.body.trim()) next.body = 'Body is required';
    if (form.audienceScope !== 'tenant' && form.audienceIds.length === 0) {
      next.audienceIds = 'Select at least one recipient';
    }
    if (form.publishedAt && form.expiresAt && new Date(form.publishedAt) >= new Date(form.expiresAt)) {
      next.expiresAt = 'Expiry must be after publish time';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (publishNow = false) => {
    if (!validate()) return;

    const payload: AnnouncementCreateInput = {
      title: form.title.trim(),
      body: form.body.trim(),
      audienceScope: form.audienceScope,
      audienceIds: form.audienceScope === 'tenant' ? undefined : form.audienceIds,
      publishedAt: publishNow
        ? new Date().toISOString()
        : form.publishedAt
          ? new Date(form.publishedAt).toISOString()
          : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };

    createAnnouncement.mutate(payload, {
      onSuccess: (created) => {
        toast.success(publishNow ? 'Announcement published' : 'Announcement saved');
        router.push(`/hr/announcements/${created.id}`);
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to save announcement');
      },
    });
  };

  const audiencePickerItems = useMemo(() => {
    if (form.audienceScope === 'department') {
      return (departments ?? []).map((d) => ({ id: d.id, label: d.name }));
    }
    if (form.audienceScope === 'specific') {
      return (employees ?? []).map((e) => ({
        id: e.id,
        label: `${e.firstName ?? e.name ?? ''} ${e.lastName ?? ''}`.trim() || e.email,
      }));
    }
    return [];
  }, [departments, employees, form.audienceScope]);

  return (
    <FormPage
      title="New Announcement"
      subtitle="Share an update with your team"
      backHref="/hr/announcements"
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Announcements', href: '/hr/announcements' },
        { label: 'New' },
      ]}
      primaryAction={{
        label: 'Publish now',
        onClick: () => handleSubmit(true),
        loading: createAnnouncement.isPending,
        disabled: createAnnouncement.isPending,
      }}
      secondaryActions={[
        {
          label: 'Save as draft',
          onClick: () => handleSubmit(false),
          variant: 'outline',
          disabled: createAnnouncement.isPending,
        },
        {
          label: 'Cancel',
          onClick: () => router.push('/hr/announcements'),
          variant: 'ghost',
        },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="Content" columns={1}>
          <FormField label="Title" required error={errors.title}>
            <Input
              placeholder="e.g. Office closure on Friday"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              maxLength={255}
            />
          </FormField>
          <FormField label="Body" required error={errors.body}>
            <Textarea
              placeholder="Write your announcement here. Markdown is supported by readers that opt in."
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              rows={8}
            />
          </FormField>
        </FormSection>

        <FormSection title="Audience" columns={1}>
          <FormField label="Who should see this?">
            <div className="grid gap-2 md:grid-cols-2">
              {audienceOptions.map((opt) => {
                const active = form.audienceScope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAudienceScope(opt.value)}
                    className={cn(
                      'rounded-md border p-3 text-left transition-colors',
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent',
                    )}
                  >
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </FormField>

          {form.audienceScope !== 'tenant' && (
            <FormField label="Recipients" required error={errors.audienceIds}>
              {form.audienceScope === 'designation' ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Designation IDs (comma separated UUIDs)"
                    value={form.audienceIds.join(',')}
                    onChange={(e) =>
                      update(
                        'audienceIds',
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide one or more designation IDs. A picker UI will be added once a
                    designation listing endpoint is wired up.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-md border p-2">
                  {audiencePickerItems.length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">
                      No options available.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {audiencePickerItems.map((item) => {
                        const checked = form.audienceIds.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleAudienceId(item.id)}
                            />
                            <span className="text-sm">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {form.audienceIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.audienceIds.map((id) => (
                    <Button
                      key={id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleAudienceId(id)}
                    >
                      {id.slice(0, 8)}… ×
                    </Button>
                  ))}
                </div>
              )}
            </FormField>
          )}
        </FormSection>

        <FormSection title="Schedule" columns={2}>
          <FormField
            label="Publish at"
            error={errors.publishedAt}
          >
            <Input
              type="datetime-local"
              value={form.publishedAt}
              onChange={(e) => update('publishedAt', e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank to keep as a draft.
            </p>
          </FormField>
          <FormField label="Expires at" error={errors.expiresAt}>
            <Input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => update('expiresAt', e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Optional — hides the announcement from the ESS feed after this time.
            </p>
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
