import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StockAdjustmentLineDto {
  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  currentQty!: string;

  @IsString()
  @IsNotEmpty()
  adjustedQty!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}

export class CreateStockAdjustmentDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => StockAdjustmentLineDto)
  lines!: StockAdjustmentLineDto[];
}
