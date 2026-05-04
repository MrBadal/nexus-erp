'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Receipt, Building2, ScrollText, ShieldCheck, Coins } from 'lucide-react';

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const reports: ReportCard[] = [
  {
    title: 'PF Return',
    description: 'Monthly EPF and EPS contributions per employee — for ECR upload.',
    href: '/hr/reports/pf-return',
    icon: ShieldCheck,
  },
  {
    title: 'ESI Return',
    description: 'Monthly ESIC contributions for employees with gross ≤ ₹21,000.',
    href: '/hr/reports/esi-return',
    icon: Receipt,
  },
  {
    title: 'PT Register',
    description: 'Professional Tax deductions grouped by state.',
    href: '/hr/reports/pt-register',
    icon: Building2,
  },
  {
    title: 'TDS Quarterly',
    description: 'TDS deductions for each quarter — for Form 24Q filing.',
    href: '/hr/reports/tds-quarterly',
    icon: ScrollText,
  },
  {
    title: 'Form 16',
    description: 'Generate Form 16 PDF certificates for employees.',
    href: '/hr/reports/form-16',
    icon: FileText,
  },
  {
    title: 'Gratuity Provisioning',
    description: 'Compute and provision gratuity liability for eligible employees.',
    href: '/hr/reports/gratuity',
    icon: Coins,
  },
];

export default function HrReportsIndexPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">HR Reports & Statutory</h1>
        <p className="text-sm text-muted-foreground">
          Generate statutory reports, Form 16 certificates, and provision gratuity liability.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="rounded-md bg-muted p-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base">{r.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
