import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, format?: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Render an assignee identifier (UUID or name) for display in tables and detail views.
 * Returns the trimmed name when given a person object, the value as-is for short strings,
 * and a truncated form ("8a3f…2c") for raw UUIDs to avoid overflowing UI columns.
 */
export function displayAssignee(
  value: string | null | undefined | { firstName?: string; lastName?: string; name?: string },
  fallback: string = '—',
): string {
  if (!value) return fallback;
  if (typeof value === 'object') {
    const full = [value.firstName, value.lastName].filter(Boolean).join(' ').trim();
    return full || value.name || fallback;
  }
  const s = String(value).trim();
  if (!s) return fallback;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return `${s.slice(0, 8)}…${s.slice(-4)}`;
  }
  return s;
}
