import { IsString, IsOptional, IsInt, Min, Max, MaxLength, IsBoolean } from 'class-validator';

export class UpdateSettingsDto {
  @IsString() @IsOptional() @MaxLength(255)
  companyName?: string;

  @IsString() @IsOptional() @MaxLength(255)
  addressLine1?: string;

  @IsString() @IsOptional() @MaxLength(255)
  addressLine2?: string;

  @IsString() @IsOptional() @MaxLength(100)
  city?: string;

  @IsString() @IsOptional() @MaxLength(100)
  state?: string;

  @IsString() @IsOptional() @MaxLength(20)
  postalCode?: string;

  @IsString() @IsOptional() @MaxLength(100)
  country?: string;

  @IsString() @IsOptional() @MaxLength(30)
  phone?: string;

  @IsString() @IsOptional() @MaxLength(255)
  website?: string;

  @IsString() @IsOptional() @MaxLength(50)
  taxId?: string;

  @IsString() @IsOptional() @MaxLength(20)
  gstNumber?: string;

  @IsString() @IsOptional() @MaxLength(15)
  panNumber?: string;

  @IsString() @IsOptional() @MaxLength(100)
  industry?: string;

  @IsString() @IsOptional()
  logoUrl?: string;

  @IsString() @IsOptional() @MaxLength(3)
  defaultCurrency?: string;

  @IsInt() @IsOptional() @Min(1) @Max(12)
  fiscalYearStartMonth?: number;

  @IsString() @IsOptional() @MaxLength(50)
  timezone?: string;

  @IsString() @IsOptional() @MaxLength(20)
  dateFormat?: string;

  @IsBoolean() @IsOptional()
  setupComplete?: boolean;
}
