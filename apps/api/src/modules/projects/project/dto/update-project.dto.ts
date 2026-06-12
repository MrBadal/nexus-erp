import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsIn,
} from 'class-validator';

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
  status?: string;

  @IsString()
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  projectType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  company?: string;

  @IsString()
  @IsOptional()
  estimatedCost?: string;

  @IsString()
  @IsOptional()
  actualCost?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  percentComplete?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsDateString()
  @IsOptional()
  actualStartDate?: string;

  @IsDateString()
  @IsOptional()
  actualEndDate?: string;

  @IsUUID()
  @IsOptional()
  projectManager?: string;
}
