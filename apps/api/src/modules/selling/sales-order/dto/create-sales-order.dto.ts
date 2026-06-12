import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalesOrderLineDto {
  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  quantity!: string;

  @IsString()
  @IsNotEmpty()
  unitPrice!: string;

  @IsString()
  @IsOptional()
  discount?: string;

  @IsString()
  @IsOptional()
  taxRate?: string;
}

export class CreateSalesOrderDto {
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @IsUUID()
  @IsOptional()
  quotationId?: string;

  @IsDateString()
  @IsNotEmpty()
  orderDate!: string;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  lines!: SalesOrderLineDto[];
}
