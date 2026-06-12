'use client';

import Link from 'next/link';
import { Users, Handshake, Activity, Target, ArrowRight, Plus, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { useContacts, useDeals, useActivities } from '@/hooks/use-crm';

const stageColors: Record<string, string> = {
  Lead: 'bg-gray-400',
  Qualified: 'bg-blue-400',
  Proposal: 'bg-indigo-400',
  Negotiation: 'bg-purple-400',
  'Closed Won': 'bg-emerald-400',
};

const activityTypeColors: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700',
  email: 'bg-green-100 text-green-700',
  meeting: 'bg-purple-100 text-purple-700',
  task: 'bg-amber-100 text-amber-700',
  note: 'bg-gray-100 text-gray-700',
};

export default function CRMDashboardPage() {
  const { data: apiContacts, isLoading: contactsLoading } = useContacts();
  const { data: apiDeals, isLoading: dealsLoading } = useDeals();
  const { data: apiActivities } = useActivities({ limit: 5, sort_by: 'created_at', sort_order: 'desc' });

  const contacts = apiContacts ?? [];
  const deals = apiDeals ?? [];
  const activities = apiActivities ?? [];

  const activeDeals = deals.filter(d => d.status === 'open' || !d.status);
  const pipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonThisMonth = deals.filter(d => d.status === 'won').length;

  const isLoading = contactsLoading || dealsLoading;

  const kpiData = [
    { label: 'Total Contacts', value: contacts.length.toLocaleString(), icon: Users },
    { label: 'Active Deals', value: String(activeDeals.length), icon: Handshake },
    { label: 'Pipeline Value', value: formatCurrency(pipelineValue), icon: DollarSign },
    { label: 'Won This Month', value: String(wonThisMonth), icon: Target },
  ];

  // Build pipeline stages from real deals
  const stageNames = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'];
  const pipelineStages = stageNames.map((name) => {
    const stageDeals = deals.filter(d => d.stage === name);
    return {
      name,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      color: stageColors[name] || 'bg-gray-400',
    };
  });

  const totalPipeline = pipelineStages.reduce((sum, s) => sum + s.value, 0);

  const topDeals = deals
    .filter(d => d.status !== 'lost')
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 4)
    .map(d => ({
      id: d.id,
      title: d.title,
      value: d.value || 0,
      stage: d.stage,
      probability: d.probability || 0,
      contact: d.contact || '',
    }));

  const recentActivities = activities.slice(0, 5).map(a => ({
    id: a.id,
    type: a.type,
    subject: a.subject,
    contact: a.contact || '',
    time: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '',
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM Overview</h1>
          <p className="text-sm text-muted-foreground">Track contacts, deals, and sales activities.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/contacts"><Button variant="outline" size="sm" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Contacts</Button></Link>
          <Link href="/crm/deals/new"><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Deal</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{item.value}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pipeline Visual */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Sales Pipeline</CardTitle>
          <Link href="/crm/deals"><Button variant="ghost" size="sm" className="gap-1 text-xs">View Pipeline <ArrowRight className="h-3 w-3" /></Button></Link>
        </CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Handshake className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No deals in the pipeline</p>
              <p className="text-xs text-muted-foreground/70">Create your first deal to start tracking sales</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                {pipelineStages.map((stage) => (
                  <div key={stage.name} className="flex-1" style={{ flex: totalPipeline > 0 ? stage.value / totalPipeline : 1 }}>
                    <div className={`h-8 rounded ${stage.color} flex items-center justify-center`}>
                      <span className="text-[10px] font-bold text-white">{stage.count}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 flex-wrap">
                {pipelineStages.map((stage) => (
                  <div key={stage.name} className="flex items-center gap-1.5 text-xs">
                    <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                    <span className="text-muted-foreground">{stage.name}</span>
                    <span className="font-medium">{formatCurrency(stage.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Deals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Top Deals</CardTitle>
            <Link href="/crm/deals"><Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button></Link>
          </CardHeader>
          <CardContent>
            {topDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No deals yet</p>
                <p className="text-xs text-muted-foreground/70">Create your first deal to see it here</p>
              </div>
            ) : (
              <div className="space-y-0">
                {topDeals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between border-b py-2.5 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{deal.title}</div>
                      <div className="text-xs text-muted-foreground">{deal.contact} · {deal.stage}</div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-semibold">{formatCurrency(deal.value)}</div>
                      <div className="text-xs text-muted-foreground">{deal.probability}% prob</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Activities</CardTitle>
            <Link href="/crm/activities"><Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button></Link>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No recent activities</p>
                <p className="text-xs text-muted-foreground/70">Activities will appear here as you interact with contacts</p>
              </div>
            ) : (
              <div className="space-y-0">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 border-b py-2.5 last:border-0">
                    <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${activityTypeColors[activity.type] || ''}`}>
                      {activity.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{activity.subject}</div>
                      <div className="text-xs text-muted-foreground">{activity.contact} · {activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
