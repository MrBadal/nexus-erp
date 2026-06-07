import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumberString,
} from 'class-validator';

export class CreateSalaryRevisionDto {
  @IsUUID()
  employeeId!: string;

  @IsDateString()
  effectiveDate!: string;

  @IsOptional()
  @IsNumberString()
  previousCtc?: string;

  @IsNumberString()
  newCtc!: string;

  @IsOptional()
  @IsNumberString()
  revisionPercent?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsUUID()
  approvedBy?: string;
}
