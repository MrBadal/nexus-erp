import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsEnum(['individual', 'company'])
  @IsOptional()
  customerType?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  mobile?: string;

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
  @MaxLength(500)
  website?: string;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  billingCity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  billingState?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  billingCountry?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  billingPostalCode?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  shippingCity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  shippingState?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  shippingCountry?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  shippingPostalCode?: string;

  @IsString()
  @IsOptional()
  creditLimit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentTerms?: string;

  @IsEnum(['active', 'inactive', 'blocked'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;
}
