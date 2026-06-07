import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumberString,
  Min,
} from 'class-validator';
import { LoanType } from './create-loan.dto.js';

export class UpdateLoanDto {
  @IsOptional()
  @IsEnum(['loan', 'advance'])
  type?: LoanType;

  @IsOptional()
  @IsNumberString()
  principalAmount?: string;

  @IsOptional()
  @IsNumberString()
  interestRate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;

  @IsOptional()
  @IsNumberString()
  emiAmount?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
