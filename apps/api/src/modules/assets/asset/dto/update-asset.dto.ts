import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAssetDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsUUID()
  @IsOptional()
  assetCategory?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  department?: string;

  @IsUUID()
  @IsOptional()
  custodian?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsString()
  @IsOptional()
  purchaseAmount?: string;

  @IsString()
  @IsOptional()
  depreciationMethod?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  usefulLife?: number;

  @IsString()
  @IsOptional()
  salvageValue?: string;

  @IsDateString()
  @IsOptional()
  warrantyExpiry?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  serialNumber?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
