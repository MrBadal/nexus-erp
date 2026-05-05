import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsUUID,
  IsDateString,
  MaxLength,
  Matches,
  Length,
} from 'class-validator';

/**
 * Create-Employee payload tuned for **Indian** employers.
 *
 * Required: firstName, lastName, email, dateOfJoining.
 * Indian statutory identifiers (PAN/Aadhaar/UAN/ESIC/IFSC) are optional at
 * creation time but format-validated when supplied.
 */
export class CreateEmployeeDto {
  // ── Core identity ──
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  email!: string;

  /** Indian mobile: 10 digits starting 6-9, optional +91/91/0 prefix. */
  @IsOptional()
  @Matches(/^(\+?91[\s-]?|0)?[6-9][\s-]?[0-9]{4}[\s-]?[0-9]{5}$/, {
    message: 'Phone must be a 10-digit Indian mobile number (starts with 6/7/8/9, optional +91 prefix; spaces/dashes allowed)',
  })
  phone?: string;
  // Note: emergencyContactPhone uses the same flexible regex below.

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'prefer_not_to_say'])
  gender?: string;

  @IsOptional()
  @IsEnum(['single', 'married', 'divorced', 'widowed'])
  maritalStatus?: string;

  // ── Address (Indian-format) ──
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  /** Full state name from the INDIAN_STATES list (e.g. "Karnataka"). Used for Professional Tax. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  /** 6-digit Indian pincode, first digit 1-9. */
  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Pincode must be 6 digits, cannot start with 0' })
  postalCode?: string;

  // ── Employment ──
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  designationId?: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(['full_time', 'part_time', 'contract', 'intern'])
  employmentType?: string;

  @IsDateString()
  dateOfJoining!: string;

  // ── Emergency contact ──
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergencyContactName?: string;

  @IsOptional()
  @Matches(/^(\+?91[\s-]?|0)?[6-9][\s-]?[0-9]{4}[\s-]?[0-9]{5}$/, {
    message: 'Emergency contact phone must be a 10-digit Indian mobile number (spaces/dashes allowed)',
  })
  emergencyContactPhone?: string;

  // ── Bank (for salary credit) ──
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankAccountNumber?: string;

  /** RBI IFSC: 4 letters + '0' + 6 alphanumeric (e.g. HDFC0001234). */
  @IsOptional()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i, {
    message: 'IFSC must be 11 chars in format AAAA0XXXXXX (e.g. HDFC0001234)',
  })
  bankIfscCode?: string;

  // ── Indian statutory identifiers ──

  /** PAN (Permanent Account Number): AAAAA9999A. */
  @IsOptional()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, {
    message: 'PAN must be 10 chars in format AAAAA9999A (e.g. ABCDE1234F)',
  })
  panNumber?: string;

  /** Aadhaar: 12 digits, first digit 2-9. */
  @IsOptional()
  @Matches(/^[2-9][0-9]{11}$/, { message: 'Aadhaar must be 12 digits, cannot start with 0 or 1' })
  aadhaarNumber?: string;

  /** UAN (EPFO): 12 digits. */
  @IsOptional()
  @Matches(/^[0-9]{12}$/, { message: 'UAN must be exactly 12 digits' })
  uanNumber?: string;

  /** ESIC IP number: 10-17 digits. */
  @IsOptional()
  @Matches(/^[0-9]{10,17}$/, { message: 'ESIC must be 10-17 digits' })
  esicNumber?: string;

  /** Generic national ID for non-Indian residents. Indian employees should fill aadhaarNumber instead. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationalId?: string;

  /** Tax regime selection — affects payroll TDS calculation. */
  @IsOptional()
  @IsEnum(['old', 'new'])
  taxRegime?: string;

  /** State for Professional Tax rules (defaults to `state` if not set). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pfState?: string;

  // ── Misc ──
  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}
