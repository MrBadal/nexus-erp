import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  MaxLength,
} from 'class-validator';

export class UpdateWorkstationDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  hourlyRate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  productionCapacity?: number;

  @IsString()
  @IsOptional()
  workingHours?: string;
}
