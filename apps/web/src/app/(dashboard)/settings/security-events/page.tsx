'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSecurityEvents, type SecurityEvent } from '@/hooks/use-audit';
import { formatDate } from '@/lib/utils';

const eventTypeOptions = [
  { value: '', label: 'All Events' },
  { value: 'login_success', label: 'Login Success' },
  { value: 'login_failed', label: 'Login Failed' },
  { value: 'password_change', label: 'Password Change' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'mfa_enabled', label: 'MFA Enabled' },
  { value: 'mfa_disabled', label: 'MFA Disabled' },
  { value: 'account_locked', label: 'Account Locked' },
  { value: 'token_refresh', label: 'Token Refresh' },
];

const eventTypeBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  login_success: 'default',
  login_failed: 'destructive',
  password_change: 'secondary',
  password_reset: 'secondary',
  mfa_enabled: 'default',
  mfa_disabled: 'destructive',
  account_locked: 'destructive',
  token_refresh: 'outline',
};

function truncateStr(str: string, len: number): string {
  return str.length > len ? `${str.slice(0, len)}...` : str;
}

export default function SecurityEventsPage() {
  const [eventType, setEventType] = useState('');
  const [limit, setLimit] = useState(50);

  const { data: events, isLoading } = useSecurityEvents({
    eventType: eventType || undefined,
    limit,
  });

  const eventList = Array.isArray(events) ? events : [];

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/settings" className="hover:text-foreground">Settings</Link>
            <span>&rsaquo;</span>
            <span>Security Events</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Security Events</h1>
              <p className="text-sm text-muted-foreground">
                View authentication and security-related events
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={eventType || '_all'}
                onValueChange={(v) => setEventType(v === '_all' ? '' : v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypeOptions.map((opt) => (
                    <SelectItem key={opt.value || '_all'} value={opt.value || '_all'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : eventList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No security events found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>User Agent</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventList.map((event: SecurityEvent) => {
                    const eventLabel = event.eventType
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase());
                    const variant = eventTypeBadgeVariant[event.eventType] ?? 'outline';

                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge variant={variant}>{eventLabel}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {event.ipAddress ?? '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {event.userAgent ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm truncate block cursor-help">
                                  {truncateStr(event.userAgent, 30)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-md">
                                <p className="text-xs break-all">{event.userAgent}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(event.createdAt)}
                        </TableCell>
                        <TableCell>
                          {event.details ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground cursor-help underline decoration-dotted">
                                  View
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-sm">
                                <pre className="text-xs whitespace-pre-wrap">
                                  {JSON.stringify(event.details, null, 2)}
                                </pre>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
