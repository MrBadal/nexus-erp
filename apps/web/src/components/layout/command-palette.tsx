'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Receipt,
  TrendingUp,
  Scale,
  BarChart3,
  Search,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href: string;
  category: string;
}

const NAVIGATION_COMMANDS: CommandItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview and key metrics',
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: '/dashboard',
    category: 'Pages',
  },
  {
    id: 'accounts',
    label: 'Chart of Accounts',
    description: 'Manage financial accounts',
    icon: <BookOpen className="h-4 w-4" />,
    href: '/finance/accounts',
    category: 'Pages',
  },
  {
    id: 'journal-entries',
    label: 'Journal Entries',
    description: 'View and create journal entries',
    icon: <ClipboardList className="h-4 w-4" />,
    href: '/finance/journal-entries',
    category: 'Pages',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    description: 'Sales and purchase invoices',
    icon: <Receipt className="h-4 w-4" />,
    href: '/finance/invoices',
    category: 'Pages',
  },
  {
    id: 'general-ledger',
    label: 'General Ledger',
    description: 'Detailed ledger report',
    icon: <FileText className="h-4 w-4" />,
    href: '/finance/reports/general-ledger',
    category: 'Reports',
  },
  {
    id: 'trial-balance',
    label: 'Trial Balance',
    description: 'Account balances summary',
    icon: <Scale className="h-4 w-4" />,
    href: '/finance/reports/trial-balance',
    category: 'Reports',
  },
  {
    id: 'profit-loss',
    label: 'Profit & Loss',
    description: 'Income and expenses report',
    icon: <TrendingUp className="h-4 w-4" />,
    href: '/finance/reports/profit-loss',
    category: 'Reports',
  },
  {
    id: 'balance-sheet',
    label: 'Balance Sheet',
    description: 'Assets, liabilities and equity',
    icon: <BarChart3 className="h-4 w-4" />,
    href: '/finance/reports/balance-sheet',
    category: 'Reports',
  },
  {
    id: 'new-invoice',
    label: 'New Invoice',
    description: 'Create a new invoice',
    icon: <Receipt className="h-4 w-4" />,
    href: '/finance/invoices/new',
    category: 'Quick Actions',
  },
  {
    id: 'new-journal',
    label: 'New Journal Entry',
    description: 'Record a new journal entry',
    icon: <FileText className="h-4 w-4" />,
    href: '/finance/journal-entries/new',
    category: 'Quick Actions',
  },
  {
    id: 'new-account',
    label: 'New Account',
    description: 'Add a new account',
    icon: <BookOpen className="h-4 w-4" />,
    href: '/finance/accounts/new',
    category: 'Quick Actions',
  },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCommands = NAVIGATION_COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  // Group by category
  const grouped = filteredCommands.reduce<Record<string, CommandItem[]>>(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {}
  );

  const flatItems = filteredCommands;

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery('');
      setSelectedIndex(0);
      router.push(href);
    },
    [onOpenChange, router]
  );

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            navigate(flatItems[selectedIndex].href);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [flatItems, selectedIndex, navigate, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg gap-0 overflow-hidden p-0"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>

        {/* Search input */}
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="h-10 border-0 bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto p-1"
        >
          {flatItems.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => {
              return (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {category}
                  </div>
                  {items.map((item) => {
                    const globalIndex = flatItems.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        data-index={globalIndex}
                        onClick={() => navigate(item.href)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm outline-none transition-colors',
                          globalIndex === selectedIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground'
                        )}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground">
                          {item.icon}
                        </span>
                        <div className="flex flex-1 flex-col items-start">
                          <span className="font-medium">{item.label}</span>
                          {item.description && (
                            <span className="text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              &uarr;&darr;
            </kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>
            <span>Open</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>
            <span>Close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
