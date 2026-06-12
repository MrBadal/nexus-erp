'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Shield, Lock, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRoles, useDeleteRole, type RoleRecord } from '@/hooks/use-settings';

export default function RolesPage() {
  const [search, setSearch] = useState('');
  const { data: roles, isLoading } = useRoles();
  const deleteRole = useDeleteRole();

  const displayRoles = (roles ?? []) as RoleRecord[];
  const filtered = displayRoles.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (role: RoleRecord) => {
    if (role.isSystem) {
      toast.error('Cannot delete system role');
      return;
    }
    try {
      await deleteRole.mutateAsync(role.id);
      toast.success(`Role "${role.name}" deleted`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete role'));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Manage access control roles</p>
        </div>
        <Link href="/settings/roles/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Role</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{displayRoles.length}</div>
            <div className="text-xs text-muted-foreground">Total Roles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{displayRoles.filter((r) => r.isSystem).length}</div>
            <div className="text-xs text-muted-foreground">System Roles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{displayRoles.filter((r) => !r.isSystem).length}</div>
            <div className="text-xs text-muted-foreground">Custom Roles</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search roles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading roles...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">No roles found.</p>
            <Link href="/settings/roles/new">
              <Button size="sm">Create Role</Button>
            </Link>
          </div>
        ) : (
          filtered.map((role) => (
            <Card key={role.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-semibold">{role.name}</div>
                      <div className="text-xs text-muted-foreground">{role.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {role.isSystem && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px]">
                        <Lock className="mr-1 h-3 w-3" />System
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{role.description ?? 'No description'}</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 5).map((p) => (
                    <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                  ))}
                  {role.permissions.length > 5 && (
                    <Badge variant="outline" className="text-[10px]">+{role.permissions.length - 5} more</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Level: {role.hierarchyLevel}</span>
                  {!role.isSystem && (
                    <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(role)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
