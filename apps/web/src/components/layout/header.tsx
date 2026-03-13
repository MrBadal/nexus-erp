"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  ChevronRight,
  LogOut,
  UserCircle,
  Settings,
  Moon,
  Sun,
  Plus,
  FileText,
  BookOpen,
  Receipt,
} from "lucide-react";
import { useTheme } from "next-themes";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let currentPath = "";

  for (const segment of segments) {
    currentPath += `/${segment}`;
    crumbs.push({
      label: segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      href: currentPath,
    });
  }

  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const breadcrumbs = getBreadcrumbs(pathname);
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  // Global Ctrl+K / Cmd+K handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="flex h-12 items-center justify-between border-b bg-background px-4">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <Link
                href={crumb.href}
                className={cn(
                  "hover:text-foreground transition-colors",
                  index === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : ""
                )}
              >
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Search / Cmd+K trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 rounded-md border bg-muted/50 px-3 h-8 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="pointer-events-none ml-4 hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              Ctrl+K
            </kbd>
          </button>

          {/* Quick create dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
                <span className="sr-only">Quick create</span>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
              >
                <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Quick Create
                </DropdownMenu.Label>
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  onSelect={() => {
                    window.location.href = "/finance/invoices/new";
                  }}
                >
                  <Receipt className="h-4 w-4" />
                  New Invoice
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  onSelect={() => {
                    window.location.href = "/finance/journal-entries/new";
                  }}
                >
                  <FileText className="h-4 w-4" />
                  New Journal Entry
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  onSelect={() => {
                    window.location.href = "/finance/accounts/new";
                  }}
                >
                  <BookOpen className="h-4 w-4" />
                  New Account
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent focus:outline-none">
                <Avatar.Root className="h-7 w-7 overflow-hidden rounded-full">
                  <Avatar.Image
                    src={user?.avatarUrl}
                    alt={user?.fullName}
                    className="h-full w-full object-cover"
                  />
                  <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-primary text-xs font-medium text-primary-foreground">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </Avatar.Fallback>
                </Avatar.Root>
                <span className="hidden text-sm font-medium md:inline-block">
                  {user?.fullName ?? "User"}
                </span>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
              >
                <DropdownMenu.Label className="px-2 py-1.5 text-sm font-semibold">
                  {user?.email ?? "user@example.com"}
                </DropdownMenu.Label>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent">
                  <UserCircle className="h-4 w-4" />
                  Profile
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent">
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item
                  onClick={() => {
                    logout();
                    window.location.href = "/login";
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </>
  );
}
