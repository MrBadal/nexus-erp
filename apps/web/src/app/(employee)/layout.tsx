'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  User,
  Clock,
  CalendarDays,
  Receipt,
  Wallet,
  Users,
  Calendar,
  LogOut,
  FolderOpen,
  Megaphone,
  Target,
  GraduationCap,
  Briefcase,
  Users as UsersFamily,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/ess', icon: Home },
  { label: 'My Profile', href: '/ess/profile', icon: User },
  { label: 'Attendance', href: '/ess/attendance', icon: Clock },
  { label: 'Leave', href: '/ess/leave', icon: CalendarDays },
  { label: 'Team Calendar', href: '/ess/leave/calendar', icon: Calendar },
  { label: 'Holidays', href: '/ess/holidays', icon: Calendar },
  { label: 'Payslips', href: '/ess/payslips', icon: Wallet },
  { label: 'Expenses', href: '/ess/expenses', icon: Receipt },
  { label: 'My Documents', href: '/ess/documents', icon: FolderOpen },
  { label: 'Education', href: '/ess/education', icon: GraduationCap },
  { label: 'Experience', href: '/ess/experience', icon: Briefcase },
  { label: 'Family', href: '/ess/family', icon: UsersFamily },
  { label: 'Skills', href: '/ess/skills', icon: Sparkles },
  { label: 'My Performance', href: '/ess/performance', icon: Target },
  { label: 'Announcements', href: '/ess/announcements', icon: Megaphone },
  { label: 'My Team', href: '/ess/team', icon: Users },
];

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, initialize, user, logout } = useAuthStore();

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'U';

  return (
    <div className="flex h-screen flex-col bg-muted/20">
      {/* Top header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-6 shadow-sm">
        <Link href="/ess" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">N</span>
          </div>
          <span className="text-base font-semibold">NexusERP</span>
          <span className="text-sm text-muted-foreground">- Employee Portal</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {initials}
            </div>
            <div className="hidden text-sm sm:block">
              <p className="font-medium leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left icon rail */}
        <aside className="flex w-16 shrink-0 flex-col items-center gap-1 border-r bg-background py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/ess' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
