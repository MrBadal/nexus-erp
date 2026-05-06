'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Copy, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateUser, useRoles } from '@/hooks/use-settings';

interface CreateUserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  /** Present when admin chose the invite flow (no admin-set password). */
  activationUrl?: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const createUser = useCreateUser();
  const { data: roles } = useRoles();

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleId: '',
  });

  // Result state — when set, we show the activation link modal in place of the form.
  const [result, setResult] = useState<CreateUserResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.firstName || !form.lastName) {
      toast.error('First name, last name, and email are required');
      return;
    }
    try {
      // Backend treats absence of `password` as the invite flow → returns activationUrl.
      const created = (await createUser.mutateAsync(form)) as CreateUserResponse;
      setResult(created);
      toast.success('User created — share the activation link with them');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      toast.error(message);
    }
  };

  const copyLink = async () => {
    if (!result?.activationUrl) return;
    await navigator.clipboard.writeText(result.activationUrl);
    setCopied(true);
    toast.success('Activation link copied');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/settings/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add User</h1>
          <p className="text-sm text-muted-foreground">
            Create a user account. They&apos;ll set their own password via an activation link.
          </p>
        </div>
      </div>

      {/* ─── After-create success: show activation link ─── */}
      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              {result.firstName} {result.lastName} created
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this one-time activation link with{' '}
              <span className="font-medium text-foreground">{result.email}</span>.
              They&apos;ll open it, set their own password, and can then log in.
              The link is valid for 7 days.
            </p>
            {result.activationUrl ? (
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={result.activationUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <Button onClick={copyLink} variant={copied ? 'secondary' : 'default'}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                User created with admin-set password (status active). They can log in immediately.
              </p>
            )}
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <strong>Tip:</strong> If they lose this link, open the user from the
              Users list and click <span className="font-medium">Issue reset link</span> to
              generate a new one.
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.push('/settings/users')}>
                Done
              </Button>
              <Button
                onClick={() => {
                  setResult(null);
                  setForm({ email: '', firstName: '', lastName: '', phone: '', roleId: '' });
                }}
              >
                Add another
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="Riya"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Sharma"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="riya@company.in"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={form.roleId}
                  onValueChange={(v) => setForm({ ...form, roleId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {(roles ?? []).map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The role decides which modules and actions this user can access.
                  Pick <em>HR Manager</em> / <em>HR Executive</em> for HR users,{' '}
                  <em>Accountant</em> for finance users, <em>Employee</em> for self-service-only access.
                </p>
              </div>
              <div className="rounded-md border-l-2 border-primary bg-primary/5 p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">How this works:</strong> No password
                is set here. After save, you&apos;ll get a one-time activation link to
                share with the user. They&apos;ll click it, set their own password, and
                their account becomes active.
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 mt-4">
            <Link href="/settings/users">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createUser.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {createUser.isPending ? 'Creating...' : 'Create & generate invite link'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
