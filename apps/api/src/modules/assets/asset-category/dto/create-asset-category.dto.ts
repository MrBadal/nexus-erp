import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAssetCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

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
}
