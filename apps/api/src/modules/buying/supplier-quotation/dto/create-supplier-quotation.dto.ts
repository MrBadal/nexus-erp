import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SupplierQuotationLineDto {
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

  @IsNumber()
  @IsOptional()
  leadTime?: number;
}

export class CreateSupplierQuotationDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId!: string;

  @IsDateString()
  @IsNotEmpty()
  requestDate!: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierQuotationLineDto)
  lines!: SupplierQuotationLineDto[];
}
