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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateKnowledgeBaseArticle } from '@/hooks/use-helpdesk';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewKnowledgeBaseArticlePage() {
  const router = useRouter();
  const createMutation = useCreateKnowledgeBaseArticle();

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('draft');

  function handleSave() {
    if (!title) {
      toast.error('Title is required');
      return;
    }
    createMutation.mutate(
      {
        title,
        category: category || undefined,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        content: content || undefined,
        status,
      },
      {
        onSuccess: (data) => {
          toast.success('Article created');
          const id = (data as { id?: string })?.id;
          if (id) {
            router.push(`/helpdesk/knowledge-base/${id}`);
          } else {
            router.push('/helpdesk/knowledge-base');
          }
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create article')),
      },
    );
  }

  return (
    <FormPage
      title="New KB Article"
      breadcrumbs={[
        { label: 'Helpdesk', href: '/helpdesk' },
        { label: 'Knowledge Base', href: '/helpdesk/knowledge-base' },
        { label: 'New Article' },
      ]}
      backHref="/helpdesk/knowledge-base"
      primaryAction={{
        label: 'Create Article',
        onClick: handleSave,
        loading: createMutation.isPending,
      }}
      secondaryActions={[
        {
          label: 'Cancel',
          onClick: () => router.push('/helpdesk/knowledge-base'),
          variant: 'outline',
        },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="Article Details" columns={2}>
          <FormField label="Title" className="col-span-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
            />
          </FormField>
          <FormField label="Category">
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Finance, Inventory"
            />
          </FormField>
          <FormField label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Tags" className="col-span-2">
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags (e.g. invoicing, tax, setup)"
            />
          </FormField>
        </FormSection>

        <FormSection title="Content" columns={1} collapsible={false}>
          <FormField label="Content">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Article content (markdown supported)"
              rows={20}
              className="font-mono text-sm"
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
