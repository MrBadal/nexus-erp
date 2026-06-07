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
  Warehouse,
  ArrowRightLeft,
  Boxes,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Handshake,
  Activity,
  Target,
  Phone,
  ShoppingCart,
  Truck,
  FileCheck,
  Send,
  ClipboardCheck,
  Store,
  Factory,
  Cog,
  Wrench,
  FolderKanban,
  ListTodo,
  Timer,
  HardDrive,
  Tag,
  Shield,
  SearchCheck,
  AlertTriangle,
  LifeBuoy,
  Ticket,
  BookOpenCheck,
  Gauge,
  HardHat,
  Ruler,
  PackageMinus,
  Lock,
  Repeat,
  Megaphone,
  Award,
  Network,
  UserPlus,
  UserMinus,
  CalendarDays,
  AlarmClock,
  ListChecks,
  GraduationCap,
  FolderOpen,
  BadgeIndianRupee,
  Mail,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
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
  /**
   * Show this nav group only if the current user has any permission whose
   * string starts with one of these prefixes (e.g. 'hr:', 'finance:').
   * If omitted, item is shown to everyone authenticated.
   * Admins (with permission '*') see everything regardless.
   */
  requiredPrefix?: string[];
}

/** Returns true iff `userPerms` includes the wildcard '*' or any string starting with one of `prefixes`. */
function hasAnyPrefix(userPerms: string[] | undefined, prefixes?: string[]): boolean {
  if (!prefixes || prefixes.length === 0) return true;
  if (!userPerms || userPerms.length === 0) return false;
  if (userPerms.includes('*')) return true;
  return userPerms.some((p) => prefixes.some((pre) => p.startsWith(pre)));
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
    requiredPrefix: ['finance:', 'reports:'],
    children: [
      { title: "Chart of Accounts", href: "/finance/accounts", icon: BookOpen },
      {
        title: "Journal Entries",
        href: "/finance/journal-entries",
        icon: ClipboardList,
      },
      { title: "Invoices", href: "/finance/invoices", icon: FileText },
      { title: "Bills", href: "/finance/bills", icon: Receipt },
      { title: "Payments", href: "/finance/payments", icon: CreditCard },
      { title: "Budgets", href: "/finance/budgets", icon: BarChart3 },
      { title: "Recurring Invoices", href: "/finance/recurring-invoices", icon: Repeat },
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
          {
            title: "Receivable Aging",
            href: "/finance/reports/receivable-aging",
            icon: Users,
          },
          {
            title: "Payable Aging",
            href: "/finance/reports/payable-aging",
            icon: Building2,
          },
          {
            title: "Budget Variance",
            href: "/finance/reports/budget-variance",
            icon: ClipboardList,
          },
          {
            title: "TDS Reports",
            href: "/finance/reports/tds-payment",
            icon: Receipt,
          },
        ],
      },
    ],
  },
  {
    title: "HR",
    icon: Users,
    requiredPrefix: ['hr:'],
    children: [
      { title: "HR Dashboard", href: "/hr", icon: LayoutDashboard },
      // ── People ──
      { title: "Employees", href: "/hr/employees", icon: UserCircle },
      { title: "Org Chart", href: "/hr/org-chart", icon: Network },
      { title: "Departments", href: "/hr/departments", icon: Building2 },
      { title: "Designations", href: "/hr/designations", icon: GraduationCap },
      // ── Attendance & shift ──
      {
        title: "Attendance",
        icon: Clock,
        children: [
          { title: "Records", href: "/hr/attendance", icon: ClipboardCheck },
          { title: "Regularizations", href: "/hr/attendance-regularizations", icon: ClipboardCheck },
          { title: "Shifts", href: "/hr/shifts", icon: AlarmClock },
          { title: "Policies", href: "/hr/attendance-policies", icon: Gauge },
        ],
      },
      // ── Leave ──
      {
        title: "Leave",
        icon: Calendar,
        children: [
          { title: "Applications", href: "/hr/leave", icon: ClipboardList },
          { title: "Apply", href: "/hr/leave/apply", icon: Send },
          { title: "Leave Types", href: "/hr/leave-types", icon: BookOpenCheck },
          { title: "Holidays", href: "/hr/holidays", icon: CalendarDays },
        ],
      },
      // ── Pay ──
      { title: "Payroll", href: "/hr/payroll", icon: Wallet },
      { title: "Salary Revisions", href: "/hr/salary-revisions", icon: TrendingUp },
      { title: "Expense Claims", href: "/hr/expense-claims", icon: Receipt },
      { title: "Loans & Advances", href: "/hr/loans", icon: Landmark },
      // ── Lifecycle ──
      { title: "Onboarding", href: "/hr/onboarding", icon: UserPlus },
      { title: "Offboarding", href: "/hr/offboarding", icon: UserMinus },
      { title: "Exit Clearance", href: "/hr/exit-clearances", icon: LogOut },
      // ── Performance ──
      {
        title: "Performance",
        icon: Award,
        children: [
          { title: "Review Cycles", href: "/hr/performance", icon: Calendar },
          { title: "KRA Templates", href: "/hr/performance/templates", icon: ListChecks },
        ],
      },
      // ── Recruitment ──
      {
        title: "Recruitment",
        icon: UserCircle,
        children: [
          { title: "Job Openings", href: "/hr/recruitment/job-openings", icon: ClipboardList },
          { title: "Candidates", href: "/hr/recruitment/candidates", icon: Users },
        ],
      },
      // ── Engagement & docs ──
      { title: "Documents", href: "/hr/documents", icon: FolderOpen },
      { title: "Announcements", href: "/hr/announcements", icon: Megaphone },
      // ── Statutory reports (India) ──
      {
        title: "Reports",
        icon: BarChart3,
        children: [
          { title: "All Reports", href: "/hr/reports", icon: FileText },
          { title: "Form 16", href: "/hr/reports/form-16", icon: FileText },
          { title: "Gratuity", href: "/hr/reports/gratuity", icon: BadgeIndianRupee },
          { title: "PF Return", href: "/hr/reports/pf-return", icon: BarChart3 },
          { title: "ESI Return", href: "/hr/reports/esi-return", icon: BarChart3 },
          { title: "PT Register", href: "/hr/reports/pt-register", icon: BarChart3 },
          { title: "TDS Quarterly", href: "/hr/reports/tds-quarterly", icon: BarChart3 },
        ],
      },
    ],
  },
  {
    title: "CRM",
    icon: Handshake,
    requiredPrefix: ['crm:'],
    children: [
      { title: "Leads", href: "/crm/leads", icon: Phone },
      { title: "Contacts", href: "/crm/contacts", icon: Users },
      { title: "Deals", href: "/crm/deals", icon: Target },
      { title: "Activities", href: "/crm/activities", icon: Activity },
    ],
  },
  {
    title: "Selling",
    icon: ShoppingCart,
    requiredPrefix: ['selling:'],
    children: [
      { title: "Customers", href: "/selling/customers", icon: Users },
      { title: "Sales Orders", href: "/selling/sales-orders", icon: ClipboardCheck },
      { title: "Quotations", href: "/selling/quotations", icon: Send },
      { title: "Delivery Notes", href: "/selling/delivery-notes", icon: Truck },
    ],
  },
  {
    title: "Buying",
    icon: Store,
    requiredPrefix: ['buying:'],
    children: [
      { title: "Dashboard", href: "/buying/dashboard", icon: BarChart3 },
      { title: "Suppliers", href: "/buying/suppliers", icon: Building2 },
      { title: "Purchase Orders", href: "/buying/purchase-orders", icon: FileCheck },
      { title: "Purchase Receipts", href: "/buying/purchase-receipts", icon: ClipboardList },
      { title: "Supplier Quotations", href: "/buying/supplier-quotations", icon: FileText },
      { title: "Material Requests", href: "/buying/material-requests", icon: ClipboardList },
    ],
  },
  {
    title: "Inventory",
    icon: Package,
    requiredPrefix: ['inventory:'],
    children: [
      { title: "Items", href: "/inventory/items", icon: Boxes },
      { title: "Warehouses", href: "/inventory/warehouses", icon: Warehouse },
      { title: "Stock Movements", href: "/inventory/stock-movements", icon: ArrowRightLeft },
      { title: "Stock Reconciliation", href: "/inventory/reconciliation", icon: ClipboardCheck },
    ],
  },
  {
    title: "Manufacturing",
    icon: Factory,
    requiredPrefix: ['manufacturing:'],
    children: [
      { title: "BOM", href: "/manufacturing/bom", icon: ClipboardList },
      { title: "Work Orders", href: "/manufacturing/work-orders", icon: Cog },
      { title: "Workstations", href: "/manufacturing/workstations", icon: Wrench },
    ],
  },
  {
    title: "Projects",
    icon: FolderKanban,
    requiredPrefix: ['projects:'],
    children: [
      { title: "All Projects", href: "/projects", icon: FolderKanban },
      { title: "Tasks", href: "/projects/tasks", icon: ListTodo },
      { title: "Timesheets", href: "/projects/timesheets", icon: Timer },
    ],
  },
  {
    title: "Assets",
    icon: HardDrive,
    requiredPrefix: ['assets:'],
    children: [
      { title: "Asset List", href: "/assets/list", icon: HardDrive },
      { title: "Categories", href: "/assets/categories", icon: Tag },
      { title: "Maintenance", href: "/assets/maintenance", icon: Wrench },
    ],
  },
  {
    title: "Quality",
    icon: Shield,
    requiredPrefix: ['quality:'],
    children: [
      { title: "Inspections", href: "/quality/inspections", icon: SearchCheck },
      { title: "Procedures", href: "/quality/procedures", icon: BookOpenCheck },
      { title: "NCR", href: "/quality/ncr", icon: AlertTriangle },
    ],
  },
  {
    title: "Construction",
    icon: HardHat,
    requiredPrefix: ['construction:'],
    children: [
      { title: "Overview", href: "/construction", icon: HardHat },
      { title: "Contracts", href: "/construction/contracts", icon: FileText },
      { title: "RA Bills", href: "/construction/ra-bills", icon: ClipboardList },
      { title: "Work Orders", href: "/construction/work-orders", icon: Ruler },
      { title: "Site GRNs", href: "/construction/site-grns", icon: Truck },
      { title: "Measurement Books", href: "/construction/measurement-books", icon: BookOpen },
      { title: "Daily Reports", href: "/construction/dprs", icon: ClipboardList },
      { title: "Material Issues", href: "/construction/material-issues", icon: PackageMinus },
    ],
  },
  {
    title: "Helpdesk",
    icon: LifeBuoy,
    requiredPrefix: ['helpdesk:'],
    children: [
      { title: "Tickets", href: "/helpdesk/tickets", icon: Ticket },
      { title: "Knowledge Base", href: "/helpdesk/knowledge-base", icon: BookOpenCheck },
      { title: "SLA Policies", href: "/helpdesk/sla", icon: Gauge },
    ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    // Settings is admin-only by default. The sidebar's hasAnyPrefix() helper
    // treats the wildcard '*' permission as a pass, so admins still see it.
    // Other roles (HR Manager, HR Executive, Accountant, Viewer, Employee)
    // do not have these prefixes so the group is hidden.
    requiredPrefix: ['users:', 'roles:', 'settings:'],
    children: [
      { title: "Overview", href: "/settings", icon: Settings },
      { title: "Organization", href: "/settings/organization", icon: Building2 },
      { title: "Users", href: "/settings/users", icon: Users },
      { title: "Roles", href: "/settings/roles", icon: Settings },
      { title: "Tax Rates", href: "/settings/tax-rates", icon: Receipt },
      { title: "TDS Sections", href: "/settings/tds-sections", icon: FileText },
      { title: "Number Series", href: "/settings/number-series", icon: FileText },
      { title: "Email (SMTP)", href: "/settings/smtp", icon: Mail },
      { title: "Currencies", href: "/settings/currencies", icon: DollarSign },
      { title: "Fiscal Periods", href: "/settings/fiscal-periods", icon: Calendar },
      { title: "Approval Workflows", href: "/settings/approval-workflows", icon: ClipboardCheck },
      { title: "Retention Policies", href: "/settings/retention-policies", icon: Shield },
      { title: "Legal Holds", href: "/settings/legal-holds", icon: Lock },
      { title: "Security Events", href: "/settings/security-events", icon: AlertTriangle },
      { title: "Import / Export", href: "/settings/import-export", icon: ArrowRightLeft },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>([
    "Finance",
  ]);
  // Permission-aware filtering of nav groups.
  // CRITICAL: select the RAW permissions reference (stable across renders) and do the
  // string normalization inside useMemo. Doing `.map()` inside the Zustand selector
  // returns a new array every call → useSyncExternalStore detects a snapshot change →
  // infinite render loop. See https://zustand.docs.pmnd.rs/guides/prevent-rerenders.
  const rawPermissions = useAuthStore((s) => s.permissions);
  const userRoleSlug = useAuthStore((s) => s.user?.roleSlug);
  const userPerms = React.useMemo<string[]>(
    () =>
      (rawPermissions as unknown as Array<
        { module?: string; resource?: string; action?: string } | string
      >).map((p) => (typeof p === 'string' ? p : `${p.module ?? ''}:${p.resource ?? ''}`)),
    [rawPermissions],
  );
  // Admin slug or wildcard permission unlocks everything; otherwise filter by requiredPrefix.
  const isAdmin = userRoleSlug === 'admin' || userPerms.includes('*');
  const visibleNavItems = React.useMemo(
    () => (isAdmin ? navigation : navigation.filter((item) => hasAnyPrefix(userPerms, item.requiredPrefix))),
    [isAdmin, userPerms],
  );

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
          {renderNavItems(visibleNavItems)}
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
