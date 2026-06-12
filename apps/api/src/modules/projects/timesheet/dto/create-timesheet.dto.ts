import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateTimesheetDto {
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  employeeName!: string;

  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @IsUUID()
  @IsOptional()
  taskId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  activityType!: string;

  @IsString()
  @IsNotEmpty()
  hours!: string;

  @IsString()
  @IsOptional()
  billingHours?: string;

  @IsString()
  @IsOptional()
  billingRate?: string;

  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
