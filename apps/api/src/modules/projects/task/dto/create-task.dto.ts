import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  MaxLength,
  IsIn,
} from 'class-validator';

export class CreateTaskDto {
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

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

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  estimatedHours?: string;

  @IsUUID()
  @IsOptional()
  parentTaskId?: string;

  @IsUUID()
  @IsOptional()
  dependsOn?: string;

  @IsBoolean()
  @IsOptional()
  isMilestone?: boolean;
}
