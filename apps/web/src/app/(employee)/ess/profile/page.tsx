'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useEssProfile, useUpdateEssProfile } from '@/hooks/use-ess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChangePasswordCard } from '@/components/account/change-password-card';

export default function EssProfilePage() {
  const { data: profile, isLoading } = useEssProfile();
  const updateProfile = useUpdateEssProfile();

  const [phone, setPhone] = React.useState('');
  const [currentAddress, setCurrentAddress] = React.useState('');
  const [emergencyContactName, setEmergencyContactName] = React.useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = React.useState('');

  React.useEffect(() => {
    if (profile) {
      setPhone(profile.phone ?? '');
      setCurrentAddress(profile.address ?? '');
      setEmergencyContactName(profile.emergencyContactName ?? '');
      setEmergencyContactPhone(profile.emergencyContactPhone ?? '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        phone,
        currentAddress,
        emergencyContactName,
        emergencyContactPhone,
      });
      toast.success('Profile updated');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e.response?.data?.message ?? e.message ?? 'Failed to update profile');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-lg border bg-background p-8 text-center text-muted-foreground">
        Could not load profile.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Personal details and contact information.
        </p>
      </div>

      {/* Read-only details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <ReadOnly label="Employee ID" value={profile.employeeId} />
            <ReadOnly
              label="Full Name"
              value={`${profile.firstName} ${profile.lastName}`}
            />
            <ReadOnly label="Email" value={profile.email} />
            <ReadOnly label="Department" value={profile.department ?? '-'} />
            <ReadOnly label="Designation" value={profile.designation ?? '-'} />
            <ReadOnly label="Date of Joining" value={profile.dateOfJoining} />
            <ReadOnly label="Status" value={profile.status} />
            <ReadOnly
              label="Date of Birth"
              value={profile.dateOfBirth ?? '-'}
            />
          </dl>
        </CardContent>
      </Card>

      {/* Editable fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9XXXXXXXXX"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="currentAddress">Current Address</Label>
              <Textarea
                id="currentAddress"
                value={currentAddress}
                onChange={(e) => setCurrentAddress(e.target.value)}
                placeholder="Street, City, State, Pincode"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ecName">Emergency Contact Name</Label>
              <Input
                id="ecName"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="Family member or guardian"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ecPhone">Emergency Contact Phone</Label>
              <Input
                id="ecPhone"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="+91 9XXXXXXXXX"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value || '-'}</dd>
    </div>
  );
}
