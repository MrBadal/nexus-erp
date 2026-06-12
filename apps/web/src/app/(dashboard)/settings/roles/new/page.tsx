'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useCreateRole } from '@/hooks/use-settings';

const permissionModules = [
  { module: 'finance', label: 'Finance', actions: ['read', 'write', 'delete', 'post', 'approve'] },
  { module: 'inventory', label: 'Inventory', actions: ['read', 'write', 'delete', 'approve'] },
  { module: 'selling', label: 'Selling', actions: ['read', 'write', 'delete', 'approve'] },
  { module: 'buying', label: 'Buying', actions: ['read', 'write', 'delete', 'approve'] },
  { module: 'hr', label: 'HR', actions: ['read', 'write', 'delete', 'approve'] },
  { module: 'crm', label: 'CRM', actions: ['read', 'write', 'delete'] },
  { module: 'manufacturing', label: 'Manufacturing', actions: ['read', 'write', 'delete'] },
  { module: 'projects', label: 'Projects', actions: ['read', 'write', 'delete', 'approve'] },
  { module: 'assets', label: 'Assets', actions: ['read', 'write', 'delete'] },
  { module: 'quality', label: 'Quality', actions: ['read', 'write', 'delete'] },
  { module: 'helpdesk', label: 'Helpdesk', actions: ['read', 'write', 'delete'] },
  { module: 'settings', label: 'Settings', actions: ['read', 'write'] },
];

export default function NewRolePage() {
  const router = useRouter();
  const createRole = useCreateRole();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [hierarchyLevel, setHierarchyLevel] = useState('50');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const togglePermission = (perm: string) => {
    const next = new Set(selectedPermissions);
    if (next.has(perm)) next.delete(perm); else next.add(perm);
    setSelectedPermissions(next);
  };

  const toggleModule = (module: string, actions: string[]) => {
    const modulePerms = actions.map((a) => `${module}:${a}`);
    const allSelected = modulePerms.every((p) => selectedPermissions.has(p));
    const next = new Set(selectedPermissions);
    if (allSelected) {
      modulePerms.forEach((p) => next.delete(p));
    } else {
      modulePerms.forEach((p) => next.add(p));
    }
    setSelectedPermissions(next);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) { toast.error('Name and slug are required'); return; }
    try {
      await createRole.mutateAsync({
        name,
        slug,
        description,
        hierarchyLevel: parseInt(hierarchyLevel, 10),
        permissions: Array.from(selectedPermissions),
      });
      toast.success('Role created successfully');
      router.push('/settings/roles');
    } catch (err) { toast.error(apiErrorMessage(err, 'Failed to create role')); }
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/settings/roles"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">New Role</h1>
          <p className="text-sm text-muted-foreground">Create a custom access role</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base">Role Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Sales Manager" />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="sales-manager" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Role description..." />
            </div>
            <div className="space-y-2">
              <Label>Hierarchy Level (0-100)</Label>
              <Input type="number" min="0" max="100" value={hierarchyLevel} onChange={(e) => setHierarchyLevel(e.target.value)} />
              <p className="text-xs text-muted-foreground">Higher level = more authority. Admin is 100.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Permissions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {permissionModules.map(({ module, label, actions }) => {
                const modulePerms = actions.map((a) => `${module}:${a}`);
                const allSelected = modulePerms.every((p) => selectedPermissions.has(p));
                return (
                  <div key={module} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleModule(module, actions)}
                      />
                      <span className="font-medium text-sm">{label}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 ml-6">
                      {actions.map((action) => {
                        const perm = `${module}:${action}`;
                        return (
                          <label key={perm} className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={selectedPermissions.has(perm)}
                              onCheckedChange={() => togglePermission(perm)}
                            />
                            {action}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Link href="/settings/roles"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={createRole.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createRole.isPending ? 'Creating...' : 'Create Role'}
          </Button>
        </div>
      </form>
    </div>
  );
}
