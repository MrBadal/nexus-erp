/**
 * Pathname → required-permission-prefix map.
 *
 * Used by the dashboard layout's route guard to reject direct URL navigation
 * (search bar, manual typing, bookmarks) when the user lacks the corresponding
 * domain permission. Mirrors the `requiredPrefix` declarations in the sidebar
 * so the user only sees and reaches what they're authorized for.
 *
 * Returning `null` means the path is unguarded (visible to all authenticated
 * users) — currently /dashboard, /settings, /profile, and the auth pages.
 */
export const ROUTE_PERMISSION_MAP: Array<{ prefix: string; required: string[] }> = [
  { prefix: "/finance", required: ["finance:", "reports:"] },
  { prefix: "/hr", required: ["hr:"] },
  { prefix: "/crm", required: ["crm:"] },
  { prefix: "/selling", required: ["selling:"] },
  { prefix: "/buying", required: ["buying:"] },
  { prefix: "/inventory", required: ["inventory:"] },
  { prefix: "/manufacturing", required: ["manufacturing:"] },
  { prefix: "/projects", required: ["projects:"] },
  { prefix: "/assets", required: ["assets:"] },
  { prefix: "/quality", required: ["quality:"] },
  { prefix: "/construction", required: ["construction:"] },
  { prefix: "/helpdesk", required: ["helpdesk:"] },
  // Settings is admin-only — only the wildcard '*' permission (held by admin)
  // satisfies these prefixes. Add fine-grained permissions later if needed
  // (e.g. let accountants edit tax rates with `settings:tax_rates`).
  { prefix: "/settings", required: ["users:", "roles:", "settings:"] },
];

/** Get the required permission prefixes for a pathname, or null if unguarded. */
export function getRequiredPrefixesForPath(path: string): string[] | null {
  for (const entry of ROUTE_PERMISSION_MAP) {
    if (path === entry.prefix || path.startsWith(`${entry.prefix}/`)) {
      return entry.required;
    }
  }
  return null;
}

/**
 * Returns true iff `userPerms` contains the wildcard '*' or any string starting
 * with one of `prefixes`. Mirrors the helper in `components/layout/sidebar.tsx`.
 */
export function hasAnyPermissionPrefix(
  userPerms: string[],
  prefixes: string[],
): boolean {
  if (!prefixes.length) return true;
  if (userPerms.includes("*")) return true;
  return userPerms.some((p) => prefixes.some((pre) => p.startsWith(pre)));
}
