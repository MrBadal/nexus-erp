'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChangeMyPassword } from '@/hooks/use-settings';
import { apiErrorMessage } from '@/lib/api';

const PW_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{12,}$/;

/**
 * Self-service change-password card — used by both the dashboard My Account
 * page and the ESS profile so credential management lives in one consistent
 * place. Mirrors the backend rule (PUT /users/me/password).
 */
export function ChangePasswordCard() {
  const changePassword = useChangeMyPassword();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const reset = () => setForm({ currentPassword: '', newPassword: '', confirm: '' });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.currentPassword) {
      toast.error('Enter your current password');
      return;
    }
    if (!PW_RULE.test(form.newPassword)) {
      toast.error('New password must be 12+ chars with upper, lower, digit and a symbol');
      return;
    }
    if (form.newPassword !== form.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (form.newPassword === form.currentPassword) {
      toast.error('New password must be different from the current one');
      return;
    }
    changePassword.mutate(
      { currentPassword: form.currentPassword, newPassword: form.newPassword },
      {
        onSuccess: () => {
          toast.success('Password changed. A confirmation email has been sent.');
          reset();
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to change password')),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" /> Change password
        </CardTitle>
        <CardDescription>
          Use a strong password — at least 12 characters with an uppercase letter, a
          lowercase letter, a digit and a symbol.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Current password *</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>New password *</Label>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Min 12 chars, mix upper/lower/digit/symbol"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm new password *</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
