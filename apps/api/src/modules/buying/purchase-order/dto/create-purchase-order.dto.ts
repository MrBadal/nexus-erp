import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderLineDto {
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

export class CreatePurchaseOrderDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId!: string;

  @IsDateString()
  @IsNotEmpty()
  orderDate!: string;

  @IsDateString()
  @IsOptional()
  expectedDelivery?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];
}
