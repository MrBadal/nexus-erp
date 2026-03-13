'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, GitBranch, List } from 'lucide-react';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { TreeView, type TreeNode } from '@/components/ui/tree-view';
import { StatusDot } from '@/components/ui/status-dot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useAccounts,
  useAccountTree,
  useDeleteAccount,
  type Account as HookAccount,
  type AccountTreeNode,
} from '@/hooks/use-accounts';
import { formatCurrency } from '@/lib/utils';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const accountTypeVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  asset: 'default',
  liability: 'warning',
  equity: 'secondary',
  revenue: 'success',
  expense: 'destructive',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function balanceColor(amount: number): string {
  if (amount > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (amount < 0) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}

// --------------------------------------------------------------------------
// Convert AccountTreeNode[] -> TreeNode[]
// --------------------------------------------------------------------------

function toTreeNodes(accounts: AccountTreeNode[]): TreeNode<AccountTreeNode>[] {
  return accounts.map((a) => ({
    id: a.id,
    label: `${a.code} ${a.name}`,
    data: a,
    children: a.children.length > 0 ? toTreeNodes(a.children) : undefined,
  }));
}

// --------------------------------------------------------------------------
// Table columns
// --------------------------------------------------------------------------

function buildColumns(
  onDelete: (id: string) => void,
  router: ReturnType<typeof useRouter>,
): ColumnDef<HookAccount, unknown>[] {
  return [
    {
      accessorKey: 'code',
      header: ({ column }) => <SortableHeader column={column}>Code</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.getValue('code')}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
    },
    {
      accessorKey: 'accountType',
      header: 'Type',
      cell: ({ row }) => {
        const t = row.getValue('accountType') as string;
        return <Badge variant={accountTypeVariant[t] ?? 'outline'}>{capitalize(t)}</Badge>;
      },
    },
    {
      accessorKey: 'currentBalance',
      header: ({ column }) => <SortableHeader column={column}>Balance</SortableHeader>,
      cell: ({ row }) => {
        const raw = row.getValue('currentBalance') as string;
        const num = parseFloat(raw);
        return (
          <span className={`font-mono text-sm ${balanceColor(num)}`}>
            {formatCurrency(num)}
          </span>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.getValue('isActive') as boolean;
        return (
          <StatusDot
            status={active ? 'success' : 'muted'}
            label={active ? 'Active' : 'Inactive'}
          />
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const account = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/finance/accounts/${account.id}`)}>
                View Details
              </DropdownMenuItem>
              {!account.isSystem && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(account.id)}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

// --------------------------------------------------------------------------
// Loading skeleton for tree view
// --------------------------------------------------------------------------

function TreeSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ paddingLeft: `${(i % 3) * 24 + 8}px` }}>
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default function ChartOfAccountsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  // Data hooks
  const { data: accounts, isLoading: listLoading } = useAccounts();
  const { data: tree, isLoading: treeLoading } = useAccountTree();
  const deleteMutation = useDeleteAccount();

  // Columns (stable reference)
  const columns = useMemo(
    () => buildColumns((id) => deleteMutation.mutate(id), router),
    [deleteMutation, router],
  );

  // Filter list data by search
  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.accountType.toLowerCase().includes(q),
    );
  }, [accounts, search]);

  // Convert tree to TreeNode format and filter
  const treeNodes = useMemo(() => {
    if (!tree) return [];
    return toTreeNodes(tree);
  }, [tree]);

  // Render a single tree node row
  const renderTreeNode = (node: TreeNode<AccountTreeNode>, _level: number, _isExpanded: boolean) => {
    const account = node.data;
    if (!account) return null;
    const balance = parseFloat(account.currentBalance);
    return (
      <div className="flex items-center gap-2 pr-2">
        <span className="font-mono text-xs text-muted-foreground">{account.code}</span>
        <span className="truncate text-sm">{account.name}</span>
        <Badge variant={accountTypeVariant[account.accountType] ?? 'outline'} className="ml-1 text-[10px] px-1.5 py-0">
          {capitalize(account.accountType)}
        </Badge>
        <span className={`ml-auto font-mono text-xs ${balanceColor(balance)}`}>
          {formatCurrency(balance)}
        </span>
      </div>
    );
  };

  const handleTreeNodeClick = (node: TreeNode<AccountTreeNode>) => {
    router.push(`/finance/accounts/${node.id}`);
  };

  return (
    <ListPage
      title="Chart of Accounts"
      subtitle="Manage your organization's financial accounts"
      breadcrumbs={[
        { label: 'Finance', href: '/finance' },
        { label: 'Chart of Accounts' },
      ]}
      createButton={{ label: 'Add Account', href: '/finance/accounts/new' }}
    >
      <Tabs defaultValue="tree" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tree">
            <GitBranch className="mr-1.5 h-4 w-4" />
            Tree View
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-1.5 h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        {/* Tree View */}
        <TabsContent value="tree">
          {treeLoading ? (
            <TreeSkeleton />
          ) : (
            <TreeView<AccountTreeNode>
              nodes={treeNodes}
              renderNode={renderTreeNode}
              onNodeClick={handleTreeNodeClick}
              expandAll
              searchable
              searchPlaceholder="Search accounts..."
              emptyMessage="No accounts found"
            />
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <DataTable<HookAccount, unknown>
            columns={columns}
            data={filteredAccounts}
            isLoading={listLoading}
            searchPlaceholder="Search accounts..."
            searchValue={search}
            onSearchChange={setSearch}
            onRowClick={(row) => router.push(`/finance/accounts/${row.id}`)}
            emptyMessage="No accounts found."
            enableExport
            exportFilename="chart-of-accounts"
          />
        </TabsContent>
      </Tabs>
    </ListPage>
  );
}
