import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class UpdateQuotationDto {
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;
}
