'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import {
  useAnnouncements,
  type Announcement,
  type AnnouncementStatus,
} from '@/hooks/use-announcements';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<AnnouncementStatus, 'warning' | 'success' | 'danger' | 'muted' | 'info'> = {
  draft: 'muted',
  scheduled: 'info',
  published: 'success',
  expired: 'danger',
};

const audienceLabels: Record<Announcement['audienceScope'], string> = {
  tenant: 'Everyone',
  department: 'Departments',
  designation: 'Designations',
  specific: 'Specific people',
};

export default function AnnouncementsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAnnouncements(
    search ? { search } : undefined,
  );

  const announcements = data ?? [];

  const totalCount = announcements.length;
  const drafts = announcements.filter((a) => a.status === 'draft').length;
  const published = announcements.filter((a) => a.status === 'published').length;
  const scheduled = announcements.filter((a) => a.status === 'scheduled').length;

  const columns: ColumnDef<Announcement, unknown>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <SortableHeader column={column}>Title</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link
            href={`/hr/announcements/${row.original.id}`}
            className="text-sm font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.title}
          </Link>
          <div className="line-clamp-1 text-xs text-muted-foreground">
            {row.original.body}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'audienceScope',
      header: 'Audience',
      cell: ({ row }) => (
        <span className="text-sm">{audienceLabels[row.original.audienceScope]}</span>
      ),
    },
    {
      accessorKey: 'publishedAt',
      header: 'Published',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.publishedAt ? formatDate(row.original.publishedAt) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'expiresAt',
      header: 'Expires',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.expiresAt ? formatDate(row.original.expiresAt) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'readCount',
      header: 'Reads',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.readCount ?? 0}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = (row.original.status ?? 'draft') as AnnouncementStatus;
        return (
          <StatusDot
            status={statusVariant[s]}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
          />
        );
      },
    },
  ];

  const handleRowClick = useCallback(
    (row: Announcement) => {
      router.push(`/hr/announcements/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Announcements"
      subtitle="Broadcast updates to the whole company, departments, designations, or specific people"
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Announcements' },
      ]}
      createButton={{ label: 'New Announcement', href: '/hr/announcements/new' }}
      summaryCards={[
        { label: 'Total', value: totalCount },
        { label: 'Published', value: published, icon: <span className="text-emerald-600">&#9679;</span> },
        { label: 'Scheduled', value: scheduled, icon: <span className="text-sky-500">&#9679;</span> },
        { label: 'Drafts', value: drafts, icon: <span className="text-muted-foreground">&#9679;</span> },
      ]}
    >
      <DataTable
        columns={columns}
        data={announcements}
        isLoading={isLoading}
        searchPlaceholder="Search announcements..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No announcements yet. Create one to share an update with your team."
      />
    </ListPage>
  );
}
