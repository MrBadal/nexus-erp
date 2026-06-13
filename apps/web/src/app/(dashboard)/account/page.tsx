'use client';

import { UserCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMyProfile } from '@/hooks/use-settings';
import { ChangePasswordCard } from '@/components/account/change-password-card';
import { useAuthStore } from '@/stores/auth.store';

export default function MyAccountPage() {
  const { data: profile, isLoading } = useMyProfile();
  const authUser = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  const fullName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : authUser
      ? `${authUser.firstName} ${authUser.lastName}`
      : '';

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Account</h1>
        <p className="text-sm text-muted-foreground">
          Your profile and sign-in credentials.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-4 w-4" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="text-sm font-medium">{fullName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="text-sm font-medium">{profile?.email ?? authUser?.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Role</dt>
                <dd className="text-sm font-medium capitalize">
                  {(authUser?.roleSlug ?? '').replace(/_/g, ' ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Organization</dt>
                <dd className="text-sm font-medium">{tenant?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="text-sm font-medium">{profile?.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    {profile?.status ?? 'active'}
                  </Badge>
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}
