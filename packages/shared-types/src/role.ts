export interface Permission {
  module: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'manage';
}

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: Permission[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const DEFAULT_ROLE_SLUGS = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  SALES_MANAGER: 'sales-manager',
  PURCHASE_MANAGER: 'purchase-manager',
  INVENTORY_MANAGER: 'inventory-manager',
  HR_MANAGER: 'hr-manager',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer',
} as const;

export type DefaultRoleSlug = (typeof DEFAULT_ROLE_SLUGS)[keyof typeof DEFAULT_ROLE_SLUGS];
