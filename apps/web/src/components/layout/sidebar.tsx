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
  Scale,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  badge?: number;
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
      {
        title: "Journal Entries",
        href: "/finance/journal-entries",
        icon: ClipboardList,
      },
      { title: "Invoices", href: "/finance/invoices", icon: FileText },
      { title: "Payments", href: "/finance/payments", icon: CreditCard },
      {
        title: "Reports",
        icon: TrendingUp,
        children: [
          {
            title: "General Ledger",
            href: "/finance/reports/general-ledger",
            icon: FileText,
          },
          {
            title: "Trial Balance",
            href: "/finance/reports/trial-balance",
            icon: Scale,
          },
          {
            title: "Profit & Loss",
            href: "/finance/reports/profit-loss",
            icon: TrendingUp,
          },
          {
            title: "Balance Sheet",
            href: "/finance/reports/balance-sheet",
            icon: BarChart3,
          },
        ],
      },
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
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>([
    "Finance",
  ]);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isGroupActive = (item: NavItem): boolean =>
    item.children?.some(
      (child) =>
        (child.href && pathname.startsWith(child.href)) ||
        (child.children && isGroupActive(child))
    ) ?? false;

  const renderNavItems = (items: NavItem[], depth = 0) => {
    return (
      <ul className={cn("space-y-0.5", depth > 0 && "pl-4 mt-0.5")}>
        {items.map((item) => (
          <li key={item.title}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleGroup(item.title)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 h-8 text-sm font-medium transition-colors hover:bg-sidebar-accent",
                    isGroupActive(item) && "text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.title}</span>
                      {item.badge !== undefined && (
                        <span className="mr-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground">
                          {item.badge}
                        </span>
                      )}
                      {expandedGroups.includes(item.title) ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </>
                  )}
                </button>
                {!collapsed && expandedGroups.includes(item.title) && (
                  renderNavItems(item.children, depth + 1)
                )}
              </div>
            ) : (
              collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href!}
                      className={cn(
                        "flex items-center justify-center rounded-md h-8 w-full text-sm transition-colors hover:bg-sidebar-accent",
                        isActive(item.href!)
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  href={item.href!}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 h-8 text-sm transition-colors hover:bg-sidebar-accent",
                    isActive(item.href!)
                      ? "bg-primary/10 text-primary border-l-2 border-primary font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.title}</span>
                  {item.badge !== undefined && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-12 items-center border-b bg-[#1B4F72] px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm">
                N
              </div>
              <span className="text-base font-bold text-white">NexusERP</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="mx-auto">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm">
                N
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {renderNavItems(navigation)}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
