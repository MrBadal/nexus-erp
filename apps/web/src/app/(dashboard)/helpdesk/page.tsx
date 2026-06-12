'use client';

import Link from 'next/link';
import { Headphones, Clock, CheckCircle, AlertTriangle, ArrowRight, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTickets } from '@/hooks/use-helpdesk';

interface TicketItem {
  id: string;
  ticketNumber?: string;
  number?: string;
  subject?: string;
  priority?: string;
  status?: string;
  source?: string;
  assignee?: string;
  createdAt?: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  replied: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function HelpdeskDashboardPage() {
  const { data, isLoading } = useTickets({ limit: 5 });
  const tickets = (data ?? []) as TicketItem[];

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const repliedCount = tickets.filter((t) => t.status === 'replied').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const totalCount = tickets.length;

  const priorityDistribution = [
    { priority: 'Urgent', count: tickets.filter((t) => t.priority === 'urgent').length, color: 'bg-red-500' },
    { priority: 'High', count: tickets.filter((t) => t.priority === 'high').length, color: 'bg-orange-500' },
    { priority: 'Medium', count: tickets.filter((t) => t.priority === 'medium').length, color: 'bg-yellow-500' },
    { priority: 'Low', count: tickets.filter((t) => t.priority === 'low').length, color: 'bg-green-500' },
  ];

  const totalByPriority = priorityDistribution.reduce((sum, p) => sum + p.count, 0);

  const kpis = [
    { title: 'Open Tickets', value: openCount, icon: Headphones, color: 'text-blue-600' },
    { title: 'Replied', value: repliedCount, icon: Clock, color: 'text-amber-600' },
    { title: 'Resolved', value: resolvedCount, icon: CheckCircle, color: 'text-green-600' },
    { title: 'Total Tickets', value: totalCount, icon: AlertTriangle, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Helpdesk</h1>
          <p className="text-sm text-muted-foreground">Support overview and ticket management</p>
        </div>
        <div className="flex gap-2">
          <Link href="/helpdesk/tickets">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Headphones className="h-3.5 w-3.5" /> Tickets
            </Button>
          </Link>
          <Link href="/helpdesk/tickets/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Ticket
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading helpdesk data...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Tickets</CardTitle>
            <Link href="/helpdesk/tickets">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tickets yet.</p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-[1fr_1.5fr_80px_80px_100px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                  <span>Ticket #</span><span>Subject</span><span>Priority</span><span>Status</span><span>Assignee</span>
                </div>
                {tickets.slice(0, 5).map((ticket) => (
                  <div key={ticket.id} className="grid grid-cols-[1fr_1.5fr_80px_80px_100px] gap-2 border-b py-2.5 text-sm last:border-0">
                    <span className="font-mono text-xs">{ticket.ticketNumber || ticket.number || '\u2014'}</span>
                    <span className="truncate">{ticket.subject || '\u2014'}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${priorityColors[ticket.priority || 'medium']}`}>
                      {ticket.priority || 'medium'}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${statusColors[ticket.status || 'open']}`}>
                      {ticket.status || 'open'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{ticket.assignee || '\u2014'}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Tickets by Priority</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{totalByPriority}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalByPriority === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No ticket data yet.</p>
            ) : (
              <>
                {priorityDistribution.map((item) => (
                  <div key={item.priority}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{item.priority}</span>
                      <span className="text-muted-foreground">{item.count} tickets</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: totalByPriority > 0 ? `${(item.count / totalByPriority) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Total</span>
                    <span className="font-bold">{totalByPriority}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
