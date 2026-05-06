'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/ui/status-dot';
import { Badge } from '@/components/ui/badge';
import {
  useUser,
  useUpdateUser,
  useDeleteUser,
  useRoles,
} from '@/hooks/use-settings';
import api, { endpoints } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'success' | 'muted' | 'danger' | 'warning'> = {
  active: 'success',
  inactive: 'muted',
  locked: 'danger',
  pending_verification: 'warning',
};
const statusLabel: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  locked: 'Locked',
  pending_verification: 'Awaiting password',
};

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const { data: user, isLoading } = useUser(userId);
  const { data: roles } = useRoles();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  // Editable form state — seeded once user loads.
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleId: '',
    status: 'active',
  });
  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email ?? '',
        phone: (user as { phone?: string }).phone ?? '',
        roleId: user.roleId ?? '',
        status: user.status ?? 'active',
      });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 max-w-2xl">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-sm text-muted-foreground">User not found.</p>
        <Button variant="outline" onClick={() => router.push('/settings/users')} className="mt-4">
          Back to users
        </Button>
      </div>
    );
  }

  const handleSave = () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }
    updateMutation.mutate(
      {
        id: userId,
        data: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          roleId: form.roleId || undefined,
          status: form.status,
        },
      },
      {
        onSuccess: () => toast.success('User updated'),
        onError: (err: Error) => toast.error(err.message || 'Failed to update'),
      },
    );
  };

  const handleIssueResetLink = async () => {
    try {
      const { data } = await api.post<{ activationUrl: string }>(
        endpoints.users.issueResetLink(userId),
      );
      await navigator.clipboard.writeText(data.activationUrl);
      toast.success('Activation/reset link copied to clipboard', {
        description: 'Valid 7 days, single-use. Share with the user.',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue link');
    }
  };

  const handleDelete = () => {
    if (!confirm(`Permanently deactivate ${user.firstName} ${user.lastName}?`)) return;
    deleteMutation.mutate(userId, {
      onSuccess: () => {
        toast.success('User deactivated');
        router.push('/settings/users');
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to deactivate'),
    });
  };

  const status = (user.status ?? 'active') as string;

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/settings/users')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{user.email}</span>
              <StatusDot
                status={statusVariant[status] || 'muted'}
                label={statusLabel[status] || status}
              />
              {user.mfaEnabled && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px]">
                  MFA enabled
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleIssueResetLink}>
            <Mail className="mr-2 h-4 w-4" />
            {status === 'pending_verification' ? 'Resend invite' : 'Reset password'}
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Deactivate
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 9876543210"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="No role" />
                </SelectTrigger>
                <SelectContent>
                  {(roles ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="pending_verification">Awaiting password</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last login</span>
            <span>
              {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{formatDate(user.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/settings/users')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
