import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  IsBoolean,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BomItemDto {
  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName!: string;

  @IsString()
  @IsNotEmpty()
  quantity!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  uom?: string;

  @IsString()
  @IsOptional()
  rate?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateBomDto {
  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName!: string;

  @IsString()
  @IsOptional()
  quantity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  uom?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items!: BomItemDto[];
}
