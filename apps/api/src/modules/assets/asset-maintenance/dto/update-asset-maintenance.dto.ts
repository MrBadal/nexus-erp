import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateAssetMaintenanceDto {
  @IsString()
  @IsOptional()
  maintenanceType?: string;

  @IsDateString()
  @IsOptional()
  maintenanceDate?: string;

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

  @IsString()
  @IsOptional()
  status?: string;
}
