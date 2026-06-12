import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAssetCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  depreciationMethod?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  usefulLife?: number;

  @IsUUID()
  @IsOptional()
  accountId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
