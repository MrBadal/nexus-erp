import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  IsNumberString,
  Min,
} from 'class-validator';

export type LoanType = 'loan' | 'advance';

export class CreateLoanDto {
  @IsUUID()
  employeeId!: string;

  @IsEnum(['loan', 'advance'])
  type!: LoanType;

  @IsNumberString()
  principalAmount!: string;

  @IsOptional()
  @IsNumberString()
  interestRate?: string;

  @IsInt()
  @Min(1)
  installments!: number;

  @IsOptional()
  @IsNumberString()
  emiAmount?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
