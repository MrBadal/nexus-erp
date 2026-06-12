import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateTimesheetDto {
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  activityType?: string;

  @IsString()
  @IsOptional()
  hours?: string;

  @IsString()
  @IsOptional()
  billingHours?: string;

  @IsString()
  @IsOptional()
  billingRate?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
