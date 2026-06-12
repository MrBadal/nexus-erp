'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Building2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useOrganizationSettings, useUpdateOrganizationSettings } from '@/hooks/use-settings';

const timezones = [
  'UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
  'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney',
];

const currencies = [
  { code: 'INR', name: 'Indian Rupee' }, { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' }, { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' }, { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' }, { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' }, { code: 'AED', name: 'UAE Dirham' },
];

const fiscalMonths = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function OrganizationSettingsPage() {
  const { data: settings, isLoading } = useOrganizationSettings();
  const updateSettings = useUpdateOrganizationSettings();

  const [form, setForm] = useState({
    companyName: '',
    defaultCurrency: 'INR',
    timezone: 'Asia/Kolkata',
    fiscalYearStartMonth: 4,
    phone: '',
    website: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    taxId: '',
    gstNumber: '',
    panNumber: '',
    industry: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        companyName: settings.companyName ?? '',
        defaultCurrency: settings.defaultCurrency ?? 'INR',
        timezone: settings.timezone ?? 'Asia/Kolkata',
        fiscalYearStartMonth: settings.fiscalYearStartMonth ?? 4,
        phone: settings.phone ?? '',
        website: settings.website ?? '',
        addressLine1: settings.addressLine1 ?? '',
        city: settings.city ?? '',
        state: settings.state ?? '',
        postalCode: settings.postalCode ?? '',
        country: settings.country ?? 'India',
        taxId: settings.taxId ?? '',
        gstNumber: settings.gstNumber ?? '',
        panNumber: settings.panNumber ?? '',
        industry: settings.industry ?? '',
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(form, {
      onSuccess: () => toast.success('Organization settings saved'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save settings')),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/settings"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Organization</h1>
          <p className="text-sm text-muted-foreground">Company info and general settings</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-white font-bold text-2xl">
              {form.companyName.charAt(0) || 'N'}
            </div>
            <div>
              <div className="font-semibold text-lg">{form.companyName || 'Company Name'}</div>
              <div className="text-sm text-muted-foreground">Organization Settings</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tax Identifiers</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tax ID / VAT</Label>
              <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="e.g. 22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-2">
              <Label>PAN Number</Label>
              <Input value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} placeholder="e.g. AAAAA0000A" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Street Address</Label>
            <Input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>State / Province</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Postal Code</Label>
              <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Localization</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.defaultCurrency} onValueChange={(v) => setForm({ ...form, defaultCurrency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fiscal Year Start</Label>
              <Select value={String(form.fiscalYearStartMonth)} onValueChange={(v) => setForm({ ...form, fiscalYearStartMonth: parseInt(v, 10) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fiscalMonths.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
