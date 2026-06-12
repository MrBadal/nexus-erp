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

export class PurchaseReceiptLineDto {
  @IsUUID()
  @IsOptional()
  purchaseOrderLineId?: string;

  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  acceptedQty!: string;

  @IsString()
  @IsOptional()
  rejectedQty?: string;

  @IsString()
  @IsOptional()
  rejectedReason?: string;
}

export class CreatePurchaseReceiptDto {
  @IsUUID()
  @IsOptional()
  purchaseOrderId?: string;

  @IsUUID()
  @IsNotEmpty()
  supplierId!: string;

  @IsDateString()
  @IsNotEmpty()
  receiptDate!: string;

  @IsUUID()
  @IsNotEmpty()
  warehouseId!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseReceiptLineDto)
  lines!: PurchaseReceiptLineDto[];
}
