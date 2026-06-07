import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumberString,
} from 'class-validator';

export class UpdateSalaryRevisionDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsNumberString()
  previousCtc?: string;

  @IsOptional()
  @IsNumberString()
  newCtc?: string;

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
