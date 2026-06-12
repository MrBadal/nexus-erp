import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(['stock', 'service', 'consumable'])
  @IsOptional()
  itemType?: string;

  @IsEnum([
    'each', 'kg', 'g', 'lb', 'oz', 'litre', 'ml', 'gallon',
    'box', 'pack', 'carton', 'pallet', 'metre', 'cm', 'inch',
    'foot', 'sq_metre', 'sq_foot', 'cubic_metre', 'pair',
    'dozen', 'set', 'hour', 'day', 'unit',
  ])
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  purchasePrice?: string;

  @IsString()
  @IsOptional()
  sellingPrice?: string;

  @IsString()
  @IsOptional()
  taxRate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minStockLevel?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  reorderQuantity?: number;

  @IsString()
  @IsOptional()
  weight?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  dimensions?: string;
}

export class CreateItemCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string;
}
