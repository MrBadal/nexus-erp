import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class UpdateExitClearanceDto {
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
  @IsBoolean()
  itCleared?: boolean;

  @IsOptional()
  @IsBoolean()
  financeCleared?: boolean;

  @IsOptional()
  @IsBoolean()
  hrCleared?: boolean;

  @IsOptional()
  @IsBoolean()
  adminCleared?: boolean;

  @IsOptional()
  @IsBoolean()
  managerCleared?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
