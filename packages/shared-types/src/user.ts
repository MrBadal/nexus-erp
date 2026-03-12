export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  status: UserStatus;
  role_id: string;
  last_login_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  email_verified: boolean;
  mfa_enabled: boolean;
  mfa_secret: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateUserDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  phone?: string;
  role_id: string;
}

export interface UpdateUserDto {
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string | null;
  phone?: string | null;
  status?: UserStatus;
  role_id?: string;
  preferences?: Record<string, unknown>;
}

export interface LoginDto {
  email: string;
  password: string;
  tenant_slug: string;
  mfa_code?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: Omit<User, 'password_hash' | 'mfa_secret'>;
}
