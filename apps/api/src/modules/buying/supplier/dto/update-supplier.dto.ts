import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  MaxLength,
  Min,
  Max,
  IsEmail,
  IsBoolean,
  IsUUID,
  Matches,
} from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  company?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  taxId?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactPerson?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentTerms?: string;

  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, { message: 'Invalid PAN format. Expected: ABCDE1234F' })
  panNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(15)
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, { message: 'Invalid GSTIN format' })
  gstNumber?: string;

  @IsBoolean()
  @IsOptional()
  msmeRegistered?: boolean;

  @IsEnum(['micro', 'small', 'medium'])
  @IsOptional()
  msmeCategory?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  msmeNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  bankAccountName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(11)
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  bankIfscCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  bankBranch?: string;

  @IsBoolean()
  @IsOptional()
  tdsApplicable?: boolean;

  @IsUUID()
  @IsOptional()
  defaultTdsSectionId?: string;
}
