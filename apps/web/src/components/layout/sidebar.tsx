"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  BookOpen,
  FileText,
  Users,
  UserCircle,
  Package,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Landmark,
  TrendingUp,
  Wallet,
  CreditCard,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Finance",
    icon: Landmark,
    children: [
      { title: "Chart of Accounts", href: "/finance/accounts", icon: BookOpen },
      { title: "Journal Entries", href: "/finance/journal-entries", icon: ClipboardList },
      { title: "Invoices", href: "/finance/invoices", icon: FileText },
      { title: "Payments", href: "/finance/payments", icon: CreditCard },
      { title: "Reports", href: "/finance/reports", icon: TrendingUp },
    ],
  },
  {
    title: "HR",
    icon: Users,
    children: [
      { title: "Employees", href: "/hr/employees", icon: UserCircle },
      { title: "Payroll", href: "/hr/payroll", icon: Wallet },
    ],
  },
  {
    title: "CRM",
    icon: UserCircle,
    children: [
      { title: "Contacts", href: "/crm/contacts", icon: Users },
      { title: "Deals", href: "/crm/deals", icon: Receipt },
    ],
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(["Finance"]);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isGroupActive = (item: NavItem) =>
    item.children?.some((child) => child.href && pathname.startsWith(child.href));

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              N
            </div>
            <span className="text-lg font-bold text-foreground">NexusERP</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              N
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.title}>
              {item.children ? (
                // Expandable group
                <div>
                  <button
                    onClick={() => toggleGroup(item.title)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent",
                      isGroupActive(item) && "text-primary"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.title}</span>
                        {expandedGroups.includes(item.title) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </>
                    )}
                  </button>
                  {!collapsed && expandedGroups.includes(item.title) && (
                    <ul className="mt-1 space-y-1 pl-4">
                      {item.children.map((child) => (
                        <li key={child.title}>
                          <Link
                            href={child.href!}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                              isActive(child.href!)
                                ? "bg-sidebar-accent font-medium text-primary"
                                : "text-muted-foreground"
                            )}
                          >
                            <child.icon className="h-4 w-4 shrink-0" />
                            <span>{child.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                // Direct link
                <Link
                  href={item.href!}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent",
                    isActive(item.href!)
                      ? "bg-sidebar-accent text-primary"
                      : "text-muted-foreground"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
      </div>
    </aside>
  );
}
