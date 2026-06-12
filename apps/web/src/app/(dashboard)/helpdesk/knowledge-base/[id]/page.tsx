'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import {
  useKnowledgeBaseArticle,
  useUpdateKnowledgeBaseArticle,
  useDeleteKnowledgeBaseArticle,
} from '@/hooks/use-helpdesk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ArticleStatus = 'draft' | 'published' | 'archived';

interface ArticleData {
  id: string;
  title?: string;
  category?: string;
  tags?: string | string[];
  content?: string;
  status?: ArticleStatus;
  helpfulCount?: number;
  viewCount?: number;
  views?: number;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const statusVariantMap: Record<ArticleStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  draft: 'default',
  published: 'success',
  archived: 'muted',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KnowledgeBaseArticleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const articleId = params.id;

  const { data: article, isLoading, error } = useKnowledgeBaseArticle(articleId);
  const updateMutation = useUpdateKnowledgeBaseArticle();
  const deleteMutation = useDeleteKnowledgeBaseArticle();

  const articleData = article as ArticleData | undefined;

  // Local editable state
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [localCategory, setLocalCategory] = useState<string | null>(null);
  const [localTags, setLocalTags] = useState<string | null>(null);
  const [localContent, setLocalContent] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  const currentStatus: ArticleStatus = (localStatus ?? articleData?.status ?? 'draft') as ArticleStatus;
  const currentTitle = localTitle ?? articleData?.title ?? '';
  const currentCategory = localCategory ?? articleData?.category ?? '';
  const rawTags = articleData?.tags;
  const tagsStr = Array.isArray(rawTags) ? rawTags.join(', ') : (rawTags ?? '');
  const currentTags = localTags ?? tagsStr;
  const currentContent = localContent ?? articleData?.content ?? '';

  function handleSave() {
    if (!articleData) return;
    updateMutation.mutate(
      {
        id: articleId,
        data: {
          title: currentTitle,
          category: currentCategory || undefined,
          tags: currentTags
            ? currentTags.split(',').map((t) => t.trim()).filter(Boolean)
            : undefined,
          content: currentContent || undefined,
          status: currentStatus,
        },
      },
      {
        onSuccess: () => toast.success('Article saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save article')),
      },
    );
  }

  function handleTogglePublish() {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    setLocalStatus(newStatus);
    updateMutation.mutate(
      {
        id: articleId,
        data: { status: newStatus },
      },
      {
        onSuccess: () => toast.success(newStatus === 'published' ? 'Article published' : 'Article unpublished'),
        onError: (err) => {
          setLocalStatus(currentStatus);
          toast.error(apiErrorMessage(err, 'Failed to update article status'));
        },
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(articleId, {
      onSuccess: () => {
        toast.success('Article deleted');
        router.push('/helpdesk/knowledge-base');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete article')),
    });
  }

  // ---------- Loading / Error states ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !articleData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading article' : 'Article not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/helpdesk/knowledge-base')}
          >
            Back to knowledge base
          </button>
        </div>
      </div>
    );
  }

  const meta = [
    { label: 'Status', value: currentStatus },
    { label: 'Views', value: String(articleData.viewCount ?? articleData.views ?? 0) },
    { label: 'Helpful', value: String(articleData.helpfulCount ?? 0) },
    { label: 'Author', value: articleData.author ?? '—' },
    { label: 'Updated', value: formatDate(articleData.updatedAt ?? '') },
  ];

  return (
    <FormPage
      title={currentTitle || 'KB Article'}
      breadcrumbs={[
        { label: 'Helpdesk', href: '/helpdesk' },
        { label: 'Knowledge Base', href: '/helpdesk/knowledge-base' },
        { label: currentTitle || articleId },
      ]}
      backHref="/helpdesk/knowledge-base"
      status={{ label: currentStatus, variant: statusVariantMap[currentStatus] }}
      primaryAction={{
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      secondaryActions={[
        {
          label: currentStatus === 'published' ? 'Unpublish' : 'Publish',
          onClick: handleTogglePublish,
          variant: 'outline',
        },
      ]}
      dangerAction={{ label: 'Delete', onClick: handleDelete }}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Article Details" columns={2}>
          <FormField label="Title" className="col-span-2">
            <Input
              value={currentTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="Article title"
            />
          </FormField>
          <FormField label="Category">
            <Input
              value={currentCategory}
              onChange={(e) => setLocalCategory(e.target.value)}
              placeholder="e.g. Finance, Inventory"
            />
          </FormField>
          <FormField label="Tags">
            <Input
              value={currentTags}
              onChange={(e) => setLocalTags(e.target.value)}
              placeholder="Comma-separated tags"
            />
          </FormField>
          <FormField label="Status">
            <Select value={currentStatus} onValueChange={(v) => setLocalStatus(v)}>
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
          <FormField label="Views (readonly)">
            <Input
              value={String(articleData.viewCount ?? articleData.views ?? 0)}
              readOnly
              className="bg-muted"
            />
          </FormField>
          <FormField label="Helpful Count (readonly)">
            <Input
              value={String(articleData.helpfulCount ?? 0)}
              readOnly
              className="bg-muted"
            />
          </FormField>
        </FormSection>

        <FormSection title="Content" columns={1} collapsible={false}>
          <FormField label="Content">
            <Textarea
              value={currentContent}
              onChange={(e) => setLocalContent(e.target.value)}
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
