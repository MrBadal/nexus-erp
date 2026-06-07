import { IsString, IsOptional, IsNumberString, IsISO8601 } from 'class-validator';

export class RecordRepaymentDto {
  @IsNumberString()
  amount!: string;

  @IsISO8601()
  paidDate!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
