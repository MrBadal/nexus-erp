import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class CreateLeaveApplicationDto {
  @IsUUID()
  employeeId!: string;

  @IsUUID()
  leaveTypeId!: string;

  @IsDateString()
  fromDate!: string;

  @IsDateString()
  toDate!: string;

  @IsInt()
  @Min(1)
  totalDays!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
