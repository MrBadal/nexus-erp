export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  CANCELLED = 'cancelled',
}

export interface TenantSettings {
  timezone: string;
  date_format: string;
  time_format: string;
  currency: string;
  decimal_separator: string;
  thousands_separator: string;
  fiscal_year_start: string;
  language: string;
  week_start: 'monday' | 'sunday';
  invoice_prefix: string;
  po_prefix: string;
  quote_prefix: string;
  tax_inclusive_pricing: boolean;
  multi_currency_enabled: boolean;
  approval_workflows_enabled: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: TenantStatus;
  settings: TenantSettings;
  logo_url: string | null;
  subscription_plan: string;
  subscription_expires_at: string | null;
  max_users: number;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  domain?: string;
  settings?: Partial<TenantSettings>;
  subscription_plan?: string;
  max_users?: number;
}

export interface UpdateTenantDto {
  name?: string;
  slug?: string;
  domain?: string | null;
  status?: TenantStatus;
  settings?: Partial<TenantSettings>;
  logo_url?: string | null;
  subscription_plan?: string;
  subscription_expires_at?: string | null;
  max_users?: number;
}
