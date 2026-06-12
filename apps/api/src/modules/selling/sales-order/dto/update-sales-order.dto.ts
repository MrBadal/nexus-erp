import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class UpdateSalesOrderDto {
  @IsDateString()
  @IsOptional()
  deliveryDate?: string;

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
