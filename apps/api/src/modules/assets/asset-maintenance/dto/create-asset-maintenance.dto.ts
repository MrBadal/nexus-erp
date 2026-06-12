import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateAssetMaintenanceDto {
  @IsUUID()
  @IsNotEmpty()
  assetId!: string;

  @IsString()
  @IsOptional()
  maintenanceType?: string;

  @IsDateString()
  @IsNotEmpty()
  maintenanceDate!: string;

  @IsDateString()
  @IsOptional()
  nextMaintenanceDate?: string;

  @IsString()
  @IsOptional()
  cost?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  performedBy?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
