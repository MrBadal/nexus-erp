import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto.js';

/** Update payload accepts every field of CreateEmployeeDto plus exit-related fields. */
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @IsOptional()
  @IsDateString()
  dateOfLeaving?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'terminated', 'on_leave'])
  status?: string;

  // Probation / confirmation lifecycle
  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  @IsOptional()
  @IsDateString()
  confirmationDate?: string;

  @IsOptional()
  @IsEnum(['probation', 'confirmed'])
  confirmationStatus?: string;
}
