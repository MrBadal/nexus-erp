import { z } from 'zod';

export const PASSWORD_RULES = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialChar: true,
} as const;

export const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.minLength, `Password must be at least ${PASSWORD_RULES.minLength} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be at most 255 characters')
  .transform((val) => val.toLowerCase().trim());

export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

export const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(63, 'Slug must be at most 63 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens only');

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const result = passwordSchema.safeParse(password);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => e.message),
  };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const result = emailSchema.safeParse(email);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.errors[0]?.message };
}

export function validateUuid(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}

export function validateSlug(slug: string): { valid: boolean; error?: string } {
  const result = slugSchema.safeParse(slug);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.errors[0]?.message };
}
