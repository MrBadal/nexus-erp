import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateExitClearanceDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsDateString()
  resignationDate?: string;

  @IsOptional()
  @IsDateString()
  lastWorkingDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
