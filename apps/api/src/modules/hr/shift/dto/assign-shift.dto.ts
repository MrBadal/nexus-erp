import { IsString, IsUUID, IsOptional, Matches } from 'class-validator';

export class AssignShiftDto {
  @IsUUID()
  employeeId!: string;

  @IsUUID()
  shiftId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effectiveFrom must be YYYY-MM-DD' })
  effectiveFrom!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effectiveTo must be YYYY-MM-DD' })
  effectiveTo?: string;
}
