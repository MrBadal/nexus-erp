import {
  IsString,
  IsOptional,
  IsNumberString,
  IsDateString,
} from 'class-validator';

export class SettleDto {
  @IsOptional()
  @IsNumberString()
  gratuityAmount?: string;

  @IsOptional()
  @IsNumberString()
  leaveEncashment?: string;

  @IsOptional()
  @IsNumberString()
  pendingSalary?: string;

  @IsOptional()
  @IsNumberString()
  bonusAmount?: string;

  @IsOptional()
  @IsNumberString()
  deductions?: string;

  @IsOptional()
  @IsDateString()
  settledDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
