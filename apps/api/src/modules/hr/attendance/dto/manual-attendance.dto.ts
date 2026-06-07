import {
  IsUUID,
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  Matches,
} from 'class-validator';

const STATUSES = ['present', 'absent', 'half_day', 'late', 'on_leave'] as const;
export type AttendanceStatus = (typeof STATUSES)[number];

/**
 * HR/admin manual attendance entry — used to record attendance for a missed
 * punch or to backfill a record for any date.
 */
export class ManualAttendanceDto {
  @IsUUID()
  employeeId!: string;

  /** YYYY-MM-DD */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @IsIn(STATUSES)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * HR/admin correction of an existing attendance record. All fields optional.
 */
export class UpdateAttendanceDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  workingHours?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
