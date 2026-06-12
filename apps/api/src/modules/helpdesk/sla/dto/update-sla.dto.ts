import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class UpdateSlaDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  firstResponseHours?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  resolutionHours?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsUUID()
  @IsOptional()
  escalateTo?: string;
}
