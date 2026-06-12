import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsIn,
} from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['open', 'working', 'pending_review', 'completed', 'cancelled', 'overdue'])
  status?: string;

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

  @IsDateString()
  @IsOptional()
  actualStartDate?: string;

  @IsDateString()
  @IsOptional()
  actualEndDate?: string;

  @IsString()
  @IsOptional()
  estimatedHours?: string;

  @IsString()
  @IsOptional()
  actualHours?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  percentComplete?: number;

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
