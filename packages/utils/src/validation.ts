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

// ─── Indian statutory identifiers ────────────────────────────────────

/** PAN (Permanent Account Number): AAAAA9999A — 5 letters, 4 digits, 1 letter. */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const panSchema = z
  .string()
  .regex(PAN_REGEX, 'PAN must be 10 chars in format AAAAA9999A (e.g. ABCDE1234F)')
  .transform((v) => v.toUpperCase());

/** Aadhaar Number: 12 digits, may have spaces every 4 chars; first digit cannot be 0 or 1. */
export const AADHAAR_REGEX = /^[2-9][0-9]{11}$/;
export const aadhaarSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(AADHAAR_REGEX, 'Aadhaar must be 12 digits and cannot start with 0 or 1'));

/** UAN (Universal Account Number, EPFO): 12 digits. */
export const UAN_REGEX = /^[0-9]{12}$/;
export const uanSchema = z
  .string()
  .regex(UAN_REGEX, 'UAN must be exactly 12 digits');

/** ESIC Insurance Number: 17 digits. */
export const ESIC_REGEX = /^[0-9]{10,17}$/;
export const esicSchema = z
  .string()
  .regex(ESIC_REGEX, 'ESIC must be 10–17 digits');

/** IFSC code: 4 letters + 0 + 6 alphanumeric (RBI standard). */
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ifscSchema = z
  .string()
  .regex(IFSC_REGEX, 'IFSC must be 11 chars in format AAAA0XXXXXX (e.g. HDFC0001234)')
  .transform((v) => v.toUpperCase());

/** GSTIN: 15 chars (state-code 2 + PAN 10 + entity 1 + Z + checksum 1). */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
export const gstinSchema = z
  .string()
  .regex(GSTIN_REGEX, 'GSTIN must be 15 chars in standard format')
  .transform((v) => v.toUpperCase());

/** Indian pincode: 6 digits, first digit 1–9. */
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const pincodeSchema = z
  .string()
  .regex(PINCODE_REGEX, 'Pincode must be 6 digits and cannot start with 0');

/** Indian phone: 10 digits starting 6–9, optional +91 / 91 / 0 prefix. */
export const INDIAN_PHONE_REGEX = /^(\+91|91|0)?[6-9][0-9]{9}$/;
export const indianPhoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(INDIAN_PHONE_REGEX, 'Phone must be a 10-digit Indian mobile number (6/7/8/9 prefix)'));

/** TAN (Tax Deduction Account Number): AAAA99999A — 4 letters, 5 digits, 1 letter. */
export const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
export const tanSchema = z
  .string()
  .regex(TAN_REGEX, 'TAN must be 10 chars in format AAAA99999A')
  .transform((v) => v.toUpperCase());

// ─── Plain-function validators (for non-zod consumers, e.g. class-validator @Matches) ───

export const validatePan = (v: string): boolean => PAN_REGEX.test(v.toUpperCase());
export const validateAadhaar = (v: string): boolean => AADHAAR_REGEX.test(v.replace(/[\s-]/g, ''));
export const validateUan = (v: string): boolean => UAN_REGEX.test(v);
export const validateEsic = (v: string): boolean => ESIC_REGEX.test(v);
export const validateIfsc = (v: string): boolean => IFSC_REGEX.test(v.toUpperCase());
export const validateGstin = (v: string): boolean => GSTIN_REGEX.test(v.toUpperCase());
export const validatePincode = (v: string): boolean => PINCODE_REGEX.test(v);
export const validateIndianPhone = (v: string): boolean => INDIAN_PHONE_REGEX.test(v.replace(/[\s-]/g, ''));
export const validateTan = (v: string): boolean => TAN_REGEX.test(v.toUpperCase());

// ─── Indian states + UTs (for dropdowns in forms) ─────────────────────

/** All 28 states + 8 union territories of India, with 2-letter ISO codes for store-state mapping. */
export const INDIAN_STATES = [
  { code: 'AN', name: 'Andaman and Nicobar Islands', type: 'ut' },
  { code: 'AP', name: 'Andhra Pradesh', type: 'state' },
  { code: 'AR', name: 'Arunachal Pradesh', type: 'state' },
  { code: 'AS', name: 'Assam', type: 'state' },
  { code: 'BR', name: 'Bihar', type: 'state' },
  { code: 'CH', name: 'Chandigarh', type: 'ut' },
  { code: 'CG', name: 'Chhattisgarh', type: 'state' },
  { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'ut' },
  { code: 'DL', name: 'Delhi', type: 'ut' },
  { code: 'GA', name: 'Goa', type: 'state' },
  { code: 'GJ', name: 'Gujarat', type: 'state' },
  { code: 'HR', name: 'Haryana', type: 'state' },
  { code: 'HP', name: 'Himachal Pradesh', type: 'state' },
  { code: 'JK', name: 'Jammu and Kashmir', type: 'ut' },
  { code: 'JH', name: 'Jharkhand', type: 'state' },
  { code: 'KA', name: 'Karnataka', type: 'state' },
  { code: 'KL', name: 'Kerala', type: 'state' },
  { code: 'LA', name: 'Ladakh', type: 'ut' },
  { code: 'LD', name: 'Lakshadweep', type: 'ut' },
  { code: 'MP', name: 'Madhya Pradesh', type: 'state' },
  { code: 'MH', name: 'Maharashtra', type: 'state' },
  { code: 'MN', name: 'Manipur', type: 'state' },
  { code: 'ML', name: 'Meghalaya', type: 'state' },
  { code: 'MZ', name: 'Mizoram', type: 'state' },
  { code: 'NL', name: 'Nagaland', type: 'state' },
  { code: 'OD', name: 'Odisha', type: 'state' },
  { code: 'PY', name: 'Puducherry', type: 'ut' },
  { code: 'PB', name: 'Punjab', type: 'state' },
  { code: 'RJ', name: 'Rajasthan', type: 'state' },
  { code: 'SK', name: 'Sikkim', type: 'state' },
  { code: 'TN', name: 'Tamil Nadu', type: 'state' },
  { code: 'TG', name: 'Telangana', type: 'state' },
  { code: 'TR', name: 'Tripura', type: 'state' },
  { code: 'UP', name: 'Uttar Pradesh', type: 'state' },
  { code: 'UK', name: 'Uttarakhand', type: 'state' },
  { code: 'WB', name: 'West Bengal', type: 'state' },
] as const;

export type IndianStateCode = typeof INDIAN_STATES[number]['code'];
export type IndianStateName = typeof INDIAN_STATES[number]['name'];

/** GSTIN state-code prefix (2-digit, see GST Act schedule). Used for inter-state vs intra-state determination. */
export const GST_STATE_CODES: Record<string, string> = {
  'Jammu and Kashmir': '01', 'Himachal Pradesh': '02', 'Punjab': '03', 'Chandigarh': '04',
  'Uttarakhand': '05', 'Haryana': '06', 'Delhi': '07', 'Rajasthan': '08',
  'Uttar Pradesh': '09', 'Bihar': '10', 'Sikkim': '11', 'Arunachal Pradesh': '12',
  'Nagaland': '13', 'Manipur': '14', 'Mizoram': '15', 'Tripura': '16',
  'Meghalaya': '17', 'Assam': '18', 'West Bengal': '19', 'Jharkhand': '20',
  'Odisha': '21', 'Chhattisgarh': '22', 'Madhya Pradesh': '23', 'Gujarat': '24',
  'Dadra and Nagar Haveli and Daman and Diu': '26', 'Maharashtra': '27',
  'Karnataka': '29', 'Goa': '30', 'Lakshadweep': '31', 'Kerala': '32',
  'Tamil Nadu': '33', 'Puducherry': '34', 'Andaman and Nicobar Islands': '35',
  'Telangana': '36', 'Andhra Pradesh': '37', 'Ladakh': '38',
};
