import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsIn,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

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

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsUUID()
  @IsOptional()
  projectManager?: string;
}
