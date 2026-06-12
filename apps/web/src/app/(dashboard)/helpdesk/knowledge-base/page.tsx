'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { Eye, ThumbsUp } from 'lucide-react';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { formatDate } from '@/lib/utils';
import { useKnowledgeBaseArticles } from '@/hooks/use-helpdesk';

interface Article {
  id: string;
  title?: string;
  category?: string;
  author?: string;
  status?: 'draft' | 'published' | 'archived';
  viewCount?: number;
  helpfulCount?: number;
  updatedAt?: string;
}

const statusVariant: Record<string, 'muted' | 'success' | 'warning'> = {
  draft: 'muted',
  published: 'success',
  archived: 'warning',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
      { label: 'Archived', value: 'archived' },
    ],
  },
];

const columns: ColumnDef<Article, unknown>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => <SortableHeader column={column}>Title</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/helpdesk/knowledge-base/${row.original.id}`}
        className="text-sm font-medium text-primary hover:underline max-w-[300px] truncate block"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.title || '\u2014'}
      </Link>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
        {row.original.category || '\u2014'}
      </span>
    ),
  },
  {
    accessorKey: 'author',
    header: 'Author',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.author || '\u2014'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status || 'draft';
      return <StatusDot status={statusVariant[s] || 'muted'} label={s.charAt(0).toUpperCase() + s.slice(1)} />;
    },
  },
  {
    accessorKey: 'viewCount',
    header: ({ column }) => <SortableHeader column={column}><span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Views</span></SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">{(row.original.viewCount ?? 0).toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'helpfulCount',
    header: ({ column }) => <SortableHeader column={column}><span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> Helpful</span></SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">{(row.original.helpfulCount ?? 0).toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <SortableHeader column={column}>Updated</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.updatedAt ? formatDate(row.original.updatedAt) : '\u2014'}</span>
    ),
  },
];

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useKnowledgeBaseArticles();
  const articles = (data ?? []) as Article[];

  const total = articles.length;
  const published = articles.filter((a) => a.status === 'published').length;
  const draft = articles.filter((a) => a.status === 'draft').length;
  const totalViews = articles.reduce((sum, a) => sum + (a.viewCount ?? 0), 0);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: Article) => {
      router.push(`/helpdesk/knowledge-base/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Knowledge Base"
      subtitle="Manage help articles and documentation"
      breadcrumbs={[
        { label: 'Helpdesk', href: '/helpdesk' },
        { label: 'Knowledge Base' },
      ]}
      createButton={{ label: 'New Article', href: '/helpdesk/knowledge-base/new' }}
      summaryCards={[
        { label: 'Total Articles', value: total },
        { label: 'Published', value: published, icon: <span className="text-green-600">&#9679;</span> },
        { label: 'Drafts', value: draft, icon: <span className="text-gray-600">&#9679;</span> },
        { label: 'Total Views', value: totalViews.toLocaleString() },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={articles}
        isLoading={isLoading}
        searchPlaceholder="Search articles..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No articles found."
        emptyAction={{
          label: 'Create Article',
          onClick: () => router.push('/helpdesk/knowledge-base/new'),
        }}
      />
    </ListPage>
  );
}
