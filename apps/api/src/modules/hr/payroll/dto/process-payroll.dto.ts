import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  Matches,
} from 'class-validator';

export class ProcessPayrollDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Period must be in YYYY-MM format' })
  period!: string;

  @IsUUID()
  salaryStructureId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds?: string[];
}
