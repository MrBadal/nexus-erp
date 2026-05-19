'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { Shield, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useUsers, useRoles, type UserRecord } from '@/hooks/use-settings';
import api, { endpoints } from '@/lib/api';

const statusVariant: Record<string, 'success' | 'muted' | 'danger' | 'warning'> = {
  active: 'success',
  inactive: 'muted',
  locked: 'danger',
  pending: 'warning',
  pending_verification: 'warning',
};

const statusLabel: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  locked: 'Locked',
  pending: 'Pending',
  pending_verification: 'Awaiting password',
};

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: users, isLoading } = useUsers();
  const { data: roles } = useRoles();

  const displayUsers = (users ?? []) as UserRecord[];
  const roleMap = new Map((roles ?? []).map((r) => [r.id, r.name]));

  const total = displayUsers.length;
  const activeCount = displayUsers.filter((u) => u.status === 'active').length;
  const mfaCount = displayUsers.filter((u) => u.mfaEnabled).length;

  const columns: ColumnDef<UserRecord, unknown>[] = [
    {
      accessorKey: 'firstName',
      header: ({ column }) => <SortableHeader column={column}>User</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
            {row.original.firstName?.charAt(0) || ''}{row.original.lastName?.charAt(0) || ''}
          </div>
          <div>
            <div className="font-medium">{row.original.firstName} {row.original.lastName}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'roleId',
      header: 'Role',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{roleMap.get(row.original.roleId ?? '') ?? 'No Role'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status || 'active';
        return (
          <StatusDot
            status={statusVariant[s] || 'muted'}
            label={statusLabel[s] || s.charAt(0).toUpperCase() + s.slice(1)}
          />
        );
      },
    },
    {
      accessorKey: 'mfaEnabled',
      header: 'MFA',
      cell: ({ row }) => row.original.mfaEnabled ? (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px]">Enabled</Badge>
      ) : (
        <span className="text-xs text-muted-foreground">Disabled</span>
      ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: ({ column }) => <SortableHeader column={column}>Last Login</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastLoginAt ? formatDate(row.original.lastLoginAt) : 'Never'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const { data } = await api.post<{ activationUrl: string; emailQueued?: boolean }>(
                endpoints.users.issueResetLink(row.original.id),
              );
              await navigator.clipboard.writeText(data.activationUrl);
              toast.success('Password reset email sent to the user', {
                description:
                  'A reset link was emailed (if SMTP is configured) and also copied to your clipboard. Valid 7 days, single-use.',
              });
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : 'Failed to issue link',
              );
            }
          }}
          title="Email the user a password-reset link (also copies to clipboard)"
        >
          <Mail className="mr-1 h-3.5 w-3.5" />
          {row.original.status === 'pending_verification' ? 'Resend invite' : 'Reset password'}
        </Button>
      ),
    },
  ];

  const handleRowClick = useCallback(
    (row: UserRecord) => {
      router.push(`/settings/users/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Users"
      subtitle="Manage user accounts and access"
      breadcrumbs={[
        { label: 'Settings', href: '/settings' },
        { label: 'Users' },
      ]}
      createButton={{ label: 'Add User', href: '/settings/users/new' }}
      summaryCards={[
        { label: 'Total Users', value: total },
        { label: 'Active', value: activeCount, icon: <span className="text-green-600">&#9679;</span> },
        { label: 'Inactive/Locked', value: total - activeCount, icon: <span className="text-gray-600">&#9679;</span> },
        { label: 'MFA Enabled', value: mfaCount, icon: <span className="text-blue-600">&#9679;</span> },
      ]}
    >
      <DataTable
        columns={columns}
        data={displayUsers}
        isLoading={isLoading}
        searchPlaceholder="Search users..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No users found."
        emptyAction={{
          label: 'Add User',
          onClick: () => {},
        }}
      />
    </ListPage>
  );
}
