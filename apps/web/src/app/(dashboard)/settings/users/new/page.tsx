'use client';

import { useMemo, useState } from 'react';
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
import { useEmployees } from '@/hooks/use-hr';
import { apiErrorMessage } from '@/lib/api';

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
  const { data: employees } = useEmployees();

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleId: '',
    employeeId: '',
  });

  // The selected role's slug tells us whether this is an ESS (employee) login,
  // which MUST be linked to an employee record or the portal won't scope.
  const selectedRole = useMemo(
    () => (roles ?? []).find((r) => r.id === form.roleId),
    [roles, form.roleId],
  );
  const isEmployeeRole = selectedRole?.slug === 'employee';

  const [result, setResult] = useState<CreateUserResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRoleChange = (roleId: string) => {
    const role = (roles ?? []).find((r) => r.id === roleId);
    // Switching away from the employee role clears any employee link.
    if (role?.slug !== 'employee') {
      setForm((f) => ({ ...f, roleId, employeeId: '' }));
    } else {
      setForm((f) => ({ ...f, roleId }));
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    const emp = (employees ?? []).find((e) => e.id === employeeId);
    if (!emp) {
      setForm((f) => ({ ...f, employeeId }));
      return;
    }
    // Mirror the employee's identity onto the login so they always match.
    setForm((f) => ({
      ...f,
      employeeId,
      email: emp.email ?? f.email,
      firstName: emp.firstName ?? f.firstName,
      lastName: emp.lastName ?? f.lastName,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.firstName || !form.lastName) {
      toast.error('First name, last name, and email are required');
      return;
    }
    if (!form.roleId) {
      toast.error('Select a role');
      return;
    }
    if (isEmployeeRole && !form.employeeId) {
      toast.error('Select which employee this portal login belongs to');
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        roleId: form.roleId,
      };
      if (form.employeeId) payload.employeeId = form.employeeId;
      const created = (await createUser.mutateAsync(payload)) as CreateUserResponse;
      setResult(created);
      toast.success('User created — an invite email was sent; link also shown below');
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Failed to create user'));
    }
  };

  const copyLink = async () => {
    if (!result?.activationUrl) return;
    await navigator.clipboard.writeText(result.activationUrl);
    setCopied(true);
    toast.success('Activation link copied');
    setTimeout(() => setCopied(false), 2500);
  };

  // Identity fields are locked to the employee record when linking a portal login.
  const identityLocked = isEmployeeRole && !!form.employeeId;

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
            Create a login. The user sets their own password via an emailed invite link.
          </p>
        </div>
      </div>

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
              An invitation email was sent to{' '}
              <span className="font-medium text-foreground">{result.email}</span> (if SMTP
              is configured). You can also share this one-time activation link directly —
              it&apos;s valid for 7 days.
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
                User created with an admin-set password (status active). They can log in immediately.
              </p>
            )}
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <strong>Tip:</strong> If they lose the link, open the user from the Users
              list and click <span className="font-medium">Resend invite</span> to email a new one.
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.push('/settings/users')}>
                Done
              </Button>
              <Button
                onClick={() => {
                  setResult(null);
                  setForm({ email: '', firstName: '', lastName: '', phone: '', roleId: '', employeeId: '' });
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
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={form.roleId} onValueChange={handleRoleChange}>
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
                  The role decides which modules and actions this user can access. Pick{' '}
                  <em>HR Manager</em> / <em>HR Executive</em> for HR staff, <em>Accountant</em>{' '}
                  for finance, <em>Employee</em> for self-service portal access.
                </p>
              </div>

              {/* Employee-role logins MUST link to an employee record. */}
              {isEmployeeRole && (
                <div className="space-y-2 rounded-md border-l-2 border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/20">
                  <Label>Link to Employee *</Label>
                  <Select value={form.employeeId} onValueChange={handleEmployeeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose the employee this login belongs to" />
                    </SelectTrigger>
                    <SelectContent>
                      {(employees ?? []).map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    A portal login must be tied to an employee so their attendance, leave,
                    payslips and documents resolve correctly. Tip: you can also do this in one
                    click from <span className="font-medium">HR → Employees → Invite to Portal</span>.
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="Riya"
                    readOnly={identityLocked}
                    className={identityLocked ? 'bg-muted' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Sharma"
                    readOnly={identityLocked}
                    className={identityLocked ? 'bg-muted' : ''}
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
                  readOnly={identityLocked}
                  className={identityLocked ? 'bg-muted' : ''}
                />
                {identityLocked && (
                  <p className="text-xs text-muted-foreground">
                    Pulled from the linked employee record so the login matches.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="rounded-md border-l-2 border-primary bg-primary/5 p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">How this works:</strong> No password is
                set here. On save we email the user a one-time activation link (and show it
                so you can share it directly). They click it, set their own password, and the
                account becomes active.
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 mt-4">
            <Link href="/settings/users">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createUser.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {createUser.isPending ? 'Creating...' : 'Create & send invite'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
