'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatDate } from '@/lib/utils';
import {
  useAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  type AnnouncementAudienceScope,
  type AnnouncementUpdateInput,
  type AnnouncementStatus,
} from '@/hooks/use-announcements';
import { useDepartments, useDesignations, useEmployees } from '@/hooks/use-hr';

const audienceOptions: { value: AnnouncementAudienceScope; label: string }[] = [
  { value: 'tenant', label: 'Everyone' },
  { value: 'department', label: 'By department' },
  { value: 'designation', label: 'By designation' },
  { value: 'specific', label: 'Specific people' },
];

const statusLabel: Record<AnnouncementStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  expired: 'Expired',
};

const statusVariant: Record<
  AnnouncementStatus,
  'success' | 'warning' | 'danger' | 'info' | 'muted'
> = {
  draft: 'muted',
  scheduled: 'info',
  published: 'success',
  expired: 'danger',
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Convert to "YYYY-MM-DDTHH:mm" in local time
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';

  const { data: announcement, isLoading } = useAnnouncement(id);
  const updateMutation = useUpdateAnnouncement();
  const publishMutation = usePublishAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: employees } = useEmployees();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    audienceScope: 'tenant' as AnnouncementAudienceScope,
    audienceIds: [] as string[],
    publishedAt: '',
    expiresAt: '',
  });

  useEffect(() => {
    if (announcement) {
      setForm({
        title: announcement.title,
        body: announcement.body,
        audienceScope: announcement.audienceScope,
        audienceIds: announcement.audienceIds ?? [],
        publishedAt: toLocalInput(announcement.publishedAt),
        expiresAt: toLocalInput(announcement.expiresAt),
      });
    }
  }, [announcement]);

  const audiencePickerItems = useMemo(() => {
    if (form.audienceScope === 'department') {
      return (departments ?? []).map((d) => ({ id: d.id, label: d.name }));
    }
    if (form.audienceScope === 'designation') {
      return (designations ?? []).map((d) => ({ id: d.id, label: d.name }));
    }
    if (form.audienceScope === 'specific') {
      return (employees ?? []).map((e) => ({
        id: e.id,
        label: `${e.firstName ?? e.name ?? ''} ${e.lastName ?? ''}`.trim() || e.email,
      }));
    }
    return [];
  }, [departments, designations, employees, form.audienceScope]);

  if (isLoading) {
    return (
      <FormPage
        title="Loading…"
        backHref="/hr/announcements"
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Announcements', href: '/hr/announcements' },
          { label: '…' },
        ]}
      >
        <div className="text-sm text-muted-foreground">Loading announcement…</div>
      </FormPage>
    );
  }

  if (!announcement) {
    return (
      <FormPage
        title="Not found"
        backHref="/hr/announcements"
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Announcements', href: '/hr/announcements' },
          { label: 'Not found' },
        ]}
      >
        <div className="text-sm text-muted-foreground">
          This announcement could not be found.
        </div>
      </FormPage>
    );
  }

  const status = (announcement.status ?? 'draft') as AnnouncementStatus;

  const setAudienceScope = (scope: AnnouncementAudienceScope) => {
    setForm((prev) => ({ ...prev, audienceScope: scope, audienceIds: [] }));
  };

  const toggleAudienceId = (idValue: string) => {
    setForm((prev) => {
      const set = new Set(prev.audienceIds);
      if (set.has(idValue)) set.delete(idValue);
      else set.add(idValue);
      return { ...prev, audienceIds: Array.from(set) };
    });
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    if (form.audienceScope !== 'tenant' && form.audienceIds.length === 0) {
      toast.error('Pick at least one recipient');
      return;
    }
    // DTO uses @IsOptional() + @IsISO8601() — null is rejected, omit instead
    const data: AnnouncementUpdateInput = {
      title: form.title.trim(),
      body: form.body.trim(),
      audienceScope: form.audienceScope,
      audienceIds: form.audienceScope === 'tenant' ? [] : form.audienceIds,
      ...(form.publishedAt
        ? { publishedAt: new Date(form.publishedAt).toISOString() }
        : {}),
      ...(form.expiresAt
        ? { expiresAt: new Date(form.expiresAt).toISOString() }
        : {}),
    };
    updateMutation.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success('Announcement updated');
          setEditing(false);
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to update');
        },
      },
    );
  };

  const handlePublish = () => {
    publishMutation.mutate(id, {
      onSuccess: () => toast.success('Announcement published'),
      onError: (err: Error) => toast.error(err.message || 'Failed to publish'),
    });
  };

  const handleDelete = () => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this announcement?')) {
      return;
    }
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Announcement deleted');
        router.push('/hr/announcements');
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to delete'),
    });
  };

  return (
    <FormPage
      title={announcement.title}
      subtitle={editing ? 'Editing announcement' : statusLabel[status]}
      backHref="/hr/announcements"
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Announcements', href: '/hr/announcements' },
        { label: announcement.title },
      ]}
      status={{ label: statusLabel[status], variant: statusVariant[status] }}
      primaryAction={
        editing
          ? {
              label: 'Save changes',
              onClick: handleSave,
              loading: updateMutation.isPending,
              disabled: updateMutation.isPending,
            }
          : status === 'draft'
            ? {
                label: 'Publish now',
                onClick: handlePublish,
                loading: publishMutation.isPending,
                disabled: publishMutation.isPending,
              }
            : {
                label: 'Edit',
                onClick: () => setEditing(true),
              }
      }
      secondaryActions={
        editing
          ? [
              {
                label: 'Cancel',
                onClick: () => setEditing(false),
                variant: 'outline',
              },
            ]
          : [
              {
                label: 'Edit',
                onClick: () => setEditing(true),
                variant: 'outline',
              },
            ]
      }
      dangerAction={{
        label: 'Delete',
        onClick: handleDelete,
        disabled: deleteMutation.isPending,
      }}
      meta={[
        {
          label: 'Audience',
          value: announcement.audienceScope,
        },
        {
          label: 'Recipients',
          value: announcement.audienceScope === 'tenant'
            ? 'All employees'
            : `${announcement.audienceIds?.length ?? 0} selected`,
        },
        {
          label: 'Reads',
          value: String(announcement.readCount ?? 0),
        },
        {
          label: 'Published',
          value: announcement.publishedAt ? formatDate(announcement.publishedAt) : '—',
        },
        {
          label: 'Expires',
          value: announcement.expiresAt ? formatDate(announcement.expiresAt) : '—',
        },
        {
          label: 'Created',
          value: formatDate(announcement.createdAt),
        },
      ]}
    >
      <div className="space-y-6">
        {editing ? (
          <>
            <FormSection title="Content" columns={1}>
              <FormField label="Title" required>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  maxLength={255}
                />
              </FormField>
              <FormField label="Body" required>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
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
                          'rounded-md border p-3 text-left text-sm font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-accent',
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FormField>

              {form.audienceScope !== 'tenant' && (
                <FormField label="Recipients" required>
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
                </FormField>
              )}
            </FormSection>

            <FormSection title="Schedule" columns={2}>
              <FormField label="Publish at">
                <Input
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(e) => setForm((p) => ({ ...p, publishedAt: e.target.value }))}
                />
              </FormField>
              <FormField label="Expires at">
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                />
              </FormField>
            </FormSection>
          </>
        ) : (
          <>
            <FormSection title="Content" columns={1}>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {announcement.body}
              </div>
            </FormSection>
            <FormSection title="Audience" columns={1}>
              <p className="text-sm">
                {announcement.audienceScope === 'tenant'
                  ? 'Visible to everyone in the tenant.'
                  : `Targeted ${announcement.audienceScope}: ${announcement.audienceIds?.length ?? 0} ID(s).`}
              </p>
              {announcement.audienceIds && announcement.audienceIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {announcement.audienceIds.map((aid) => (
                    <span
                      key={aid}
                      className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs"
                    >
                      {aid.slice(0, 8)}…
                    </span>
                  ))}
                </div>
              )}
            </FormSection>
          </>
        )}

        {!editing && (
          <div className="flex items-center justify-end gap-2 pt-2">
            {status === 'draft' && (
              <Button
                variant="default"
                onClick={handlePublish}
                disabled={publishMutation.isPending}
              >
                Publish now
              </Button>
            )}
          </div>
        )}
      </div>
    </FormPage>
  );
}
