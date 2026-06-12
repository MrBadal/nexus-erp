'use client';

import Link from 'next/link';
import {
  Building2,
  Users,
  Receipt,
  FileText,
  Hash,
  Globe,
  Calendar,
  ClipboardCheck,
  Shield,
  Lock,
  AlertTriangle,
  Database,
  Palette,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';

const settingsSections = [
  { title: 'Organization', description: 'Company info, GST, PAN, and business defaults', icon: Building2, href: '/settings/organization' },
  { title: 'Branding', description: 'White-label name, logo, colors, and branded login', icon: Palette, href: '/settings/branding' },
  { title: 'Users & Roles', description: 'Manage users, roles, and permissions', icon: Users, href: '/settings/users' },
  { title: 'Tax Rates', description: 'GST rates, tax codes, and compliance settings', icon: Receipt, href: '/settings/tax-rates' },
  { title: 'TDS Sections', description: 'TDS sections, rates, and thresholds', icon: FileText, href: '/settings/tds-sections' },
  { title: 'Number Series', description: 'Invoice, bill, and PO numbering formats', icon: Hash, href: '/settings/number-series' },
  { title: 'Currencies', description: 'Currency master and exchange rates', icon: Globe, href: '/settings/currencies' },
  { title: 'Fiscal Periods', description: 'Fiscal years, quarters, and period management', icon: Calendar, href: '/settings/fiscal-periods' },
  { title: 'Approval Workflows', description: 'Multi-step approval processes', icon: ClipboardCheck, href: '/settings/approval-workflows' },
  { title: 'Retention Policies', description: 'Document retention and archival rules', icon: Shield, href: '/settings/retention-policies' },
  { title: 'Legal Holds', description: 'Place holds on documents for compliance', icon: Lock, href: '/settings/legal-holds' },
  { title: 'Security Events', description: 'Login activity and security audit log', icon: AlertTriangle, href: '/settings/security-events' },
  { title: 'Import / Export', description: 'Bulk data import and export', icon: Database, href: '/settings/import-export' },
];

export default function SettingsPage() {
  const tenant = useAuthStore((s) => s.tenant);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your organization and system preferences</p>
      </div>

      {tenant && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white font-bold text-lg">
              {tenant.name?.charAt(0) ?? 'N'}
            </div>
            <div>
              <div className="text-lg font-semibold">{tenant.name}</div>
              <div className="text-sm text-muted-foreground">{tenant.slug}.nexuserp.com · {tenant.currency} · {tenant.timezone}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.title} href={section.href}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{section.title}</div>
                    <div className="text-xs text-muted-foreground">{section.description}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
