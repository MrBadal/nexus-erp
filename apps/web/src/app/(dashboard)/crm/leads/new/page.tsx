'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCreateLead } from '@/hooks/use-crm';

export default function NewLeadPage() {
  const router = useRouter();
  const create = useCreateLead();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    source: 'other',
    estimatedValue: '',
    notes: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync(form as Record<string, unknown>);
    router.push('/crm/leads');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/crm/leads">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Lead</h1>
          <p className="text-sm text-muted-foreground">Capture a new sales lead</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Lead Information</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Full Name *</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Job Title</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Source</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social_media">Social Media</option>
                <option value="cold_call">Cold Call</option>
                <option value="trade_show">Trade Show</option>
                <option value="email_campaign">Email Campaign</option>
                <option value="advertisement">Advertisement</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Estimated Value (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Address</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Address</label>
              <textarea
                rows={2}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">City</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Country</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Notes</h2>
          <textarea
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional notes about this lead..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/crm/leads"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating...' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </div>
  );
}
