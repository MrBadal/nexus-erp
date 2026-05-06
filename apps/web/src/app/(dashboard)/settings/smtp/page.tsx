'use client';

import * as React from 'react';
import { Mail, CheckCircle2, XCircle, AlertTriangle, Send, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  useSmtpSettings,
  useSaveSmtpSettings,
  useDeleteSmtpSettings,
  useTestSmtpConnection,
  useTestSendSmtp,
} from '@/hooks/use-smtp';

export default function SmtpSettingsPage() {
  const { data, isLoading } = useSmtpSettings();
  const save = useSaveSmtpSettings();
  const del = useDeleteSmtpSettings();
  const testConn = useTestSmtpConnection();
  const testSend = useTestSendSmtp();

  const [form, setForm] = React.useState({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    replyTo: '',
    enabled: true,
  });
  const [testTo, setTestTo] = React.useState('');
  const [feedback, setFeedback] = React.useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (data && !('configured' in data && data.configured === false)) {
      setForm((f) => ({
        ...f,
        host: data.host ?? '',
        port: data.port ?? 587,
        secure: !!data.secure,
        username: data.username ?? '',
        password: '', // never pre-fill password
        fromEmail: data.fromEmail ?? '',
        fromName: data.fromName ?? '',
        replyTo: data.replyTo ?? '',
        enabled: data.enabled ?? true,
      }));
    }
  }, [data]);

  const isConfigured = !!data && !('configured' in data && data.configured === false);
  const passwordAlreadySet = isConfigured && (data as { passwordSet?: boolean }).passwordSet === true;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.password) delete payload.password; // keep existing
      if (!form.fromName) delete payload.fromName;
      if (!form.replyTo) delete payload.replyTo;
      await save.mutateAsync(payload as never);
      setFeedback({ kind: 'success', text: 'SMTP settings saved.' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFeedback({ kind: 'error', text: e?.response?.data?.message || 'Failed to save SMTP settings.' });
    }
  };

  const onTestConnection = async () => {
    setFeedback(null);
    try {
      const res = await testConn.mutateAsync();
      setFeedback(
        res.ok
          ? { kind: 'success', text: 'Connection verified — SMTP credentials are valid.' }
          : { kind: 'error', text: `Connection failed: ${res.error}` },
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFeedback({ kind: 'error', text: e?.response?.data?.message || 'Connection test failed.' });
    }
  };

  const onTestSend = async () => {
    setFeedback(null);
    if (!testTo) {
      setFeedback({ kind: 'error', text: 'Enter a recipient email for the test.' });
      return;
    }
    try {
      const res = await testSend.mutateAsync(testTo);
      setFeedback(
        res.sent
          ? { kind: 'success', text: `Test email sent to ${testTo}. Check the inbox.` }
          : { kind: 'error', text: `Send failed: ${res.error || 'unknown error'}` },
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFeedback({ kind: 'error', text: e?.response?.data?.message || 'Test send failed.' });
    }
  };

  const onDelete = async () => {
    if (!confirm('Remove SMTP configuration? Outbound emails will stop until reconfigured.')) return;
    setFeedback(null);
    try {
      await del.mutateAsync();
      setForm({
        host: '', port: 587, secure: false, username: '', password: '',
        fromEmail: '', fromName: '', replyTo: '', enabled: true,
      });
      setFeedback({ kind: 'success', text: 'SMTP configuration removed.' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setFeedback({ kind: 'error', text: e?.response?.data?.message || 'Delete failed.' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email (SMTP)</h1>
        <p className="text-sm text-muted-foreground">
          Configure your company SMTP server so NexusERP can send password-reset
          links, invitation emails, leave & expense decisions, payslip
          notifications and announcements from your own domain.
        </p>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
            feedback.kind === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.kind === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> SMTP Server
          </CardTitle>
          <CardDescription>
            Credentials are encrypted at rest with AES-256-GCM. The password
            field is write-only — saved values are never returned by the API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={onSave} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="host">SMTP host *</Label>
                  <Input
                    id="host"
                    placeholder="smtp.gmail.com"
                    required
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="port">Port *</Label>
                  <Input
                    id="port"
                    type="number"
                    min={1}
                    max={65535}
                    required
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: parseInt(e.target.value || '587', 10) })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-md border p-3">
                <Switch
                  id="secure"
                  checked={form.secure}
                  onCheckedChange={(v) => setForm({ ...form, secure: !!v })}
                />
                <div className="text-sm">
                  <Label htmlFor="secure" className="cursor-pointer">Use TLS on connect (port 465)</Label>
                  <p className="text-xs text-muted-foreground">
                    Leave off for STARTTLS on port 587 (most common).
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="username">SMTP username *</Label>
                  <Input
                    id="username"
                    autoComplete="off"
                    placeholder="alerts@company.com"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="password">
                    SMTP password {passwordAlreadySet && <span className="text-xs text-muted-foreground">(leave blank to keep existing)</span>}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={passwordAlreadySet ? '••••••••' : 'App password / SMTP key'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="fromEmail">From email *</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    placeholder="no-reply@company.com"
                    required
                    value={form.fromEmail}
                    onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fromName">From name</Label>
                  <Input
                    id="fromName"
                    placeholder="Acme HR"
                    value={form.fromName}
                    onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="replyTo">Reply-to (optional)</Label>
                <Input
                  id="replyTo"
                  type="email"
                  placeholder="hr@company.com"
                  value={form.replyTo}
                  onChange={(e) => setForm({ ...form, replyTo: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3 rounded-md border p-3">
                <Switch
                  id="enabled"
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm({ ...form, enabled: !!v })}
                />
                <div className="text-sm">
                  <Label htmlFor="enabled" className="cursor-pointer">Enable outbound email</Label>
                  <p className="text-xs text-muted-foreground">
                    When off, NexusERP will skip email sends and fall back to in-app notifications and admin-shared activation links.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save settings
                  </Button>
                  {isConfigured && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onTestConnection}
                      disabled={testConn.isPending}
                    >
                      {testConn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Test connection
                    </Button>
                  )}
                </div>
                {isConfigured && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={onDelete}
                    disabled={del.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remove configuration
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" /> Send a test email
            </CardTitle>
            <CardDescription>
              Delivers a real test message using the saved configuration. Use this to confirm
              deliverability (DNS, SPF/DKIM, spam filters), not just authentication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <Label htmlFor="testTo">Recipient</Label>
                <Input
                  id="testTo"
                  type="email"
                  placeholder="you@example.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
              </div>
              <Button onClick={onTestSend} disabled={testSend.isPending || !testTo}>
                {testSend.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send test
              </Button>
            </div>
            {(data as { lastTestedAt?: string | null; lastTestStatus?: string | null; lastTestError?: string | null }).lastTestedAt && (
              <div className="mt-4 flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs">
                {(data as { lastTestStatus?: string | null }).lastTestStatus === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                )}
                <div>
                  <div className="font-medium">
                    Last connection test:{' '}
                    {(data as { lastTestStatus?: string | null }).lastTestStatus === 'success' ? 'success' : 'failure'}
                  </div>
                  <div className="text-muted-foreground">
                    {new Date((data as { lastTestedAt: string }).lastTestedAt).toLocaleString()}
                  </div>
                  {(data as { lastTestError?: string | null }).lastTestError && (
                    <div className="mt-1 text-red-700">
                      {(data as { lastTestError: string }).lastTestError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>What gets emailed</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Password resets</strong> — when a user clicks "Forgot password" on the login page.</li>
            <li><strong>Invitations</strong> — when an admin creates a user or invites an employee to the portal.</li>
            <li><strong>Leave decisions</strong> — when a manager approves or rejects a leave request.</li>
            <li><strong>Expense decisions</strong> — when a manager approves or rejects an expense claim.</li>
            <li><strong>Payslip ready</strong> — when payroll is published for a period.</li>
            <li><strong>Announcements</strong> — broadcasts to all employees on publish.</li>
          </ul>
          <p className="mt-3">
            Failed sends are recorded in the email log; the original flow continues to work
            (e.g., admins still receive activation URLs they can share manually).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
