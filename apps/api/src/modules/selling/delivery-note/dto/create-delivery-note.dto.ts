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

export class DeliveryNoteLineDto {
  @IsUUID()
  @IsOptional()
  salesOrderLineId?: string;

  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  quantity!: string;
}

export class CreateDeliveryNoteDto {
  @IsUUID()
  @IsNotEmpty()
  salesOrderId!: string;

  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @IsDateString()
  @IsNotEmpty()
  deliveryDate!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  carrier?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryNoteLineDto)
  lines!: DeliveryNoteLineDto[];
}
