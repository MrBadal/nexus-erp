'use client';

import * as React from 'react';
import { Users, Mail, Phone } from 'lucide-react';
import { useEssTeam, type EssTeamMember } from '@/hooks/use-ess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function MemberCard({ m, role }: { m: EssTeamMember; role?: string }) {
  const initials = `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}` || 'U';
  return (
    <div className="flex items-start gap-3 rounded-md border bg-background p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">
            {m.firstName} {m.lastName}
          </p>
          {role && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
              {role}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {m.designation ?? 'Team member'} · {m.employeeId}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {m.email}
          </span>
          {m.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {m.phone}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EssTeamPage() {
  const { data, isLoading } = useEssTeam();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">My Team</h1>
        <p className="text-sm text-muted-foreground">
          Your manager, peers, and direct reports.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Could not load team.</p>
      ) : (
        <div className="space-y-6">
          {/* Manager */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Manager</CardTitle>
            </CardHeader>
            <CardContent>
              {data.manager ? (
                <MemberCard m={data.manager} role="Reports to" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  You don't have a direct manager assigned.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Peers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Peers ({data.peers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.peers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No peers in your department.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.peers.map((p) => (
                    <MemberCard key={p.id} m={p} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Direct reports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Direct Reports ({data.directReports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.directReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don't manage anyone yet.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.directReports.map((r) => (
                    <MemberCard key={r.id} m={r} role="Reports to you" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
