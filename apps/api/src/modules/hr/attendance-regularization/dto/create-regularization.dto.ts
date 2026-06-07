import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
} from 'class-validator';

export const REGULARIZATION_STATUSES = [
  'present',
  'absent',
  'half_day',
  'late',
  'on_leave',
] as const;

export class CreateRegularizationDto {
  /** Optional — only used by the HR controller. ESS derives it from the JWT. */
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsDateString()
  requestedCheckIn?: string;

  @IsOptional()
  @IsDateString()
  requestedCheckOut?: string;

  @IsIn(REGULARIZATION_STATUSES)
  requestedStatus!: (typeof REGULARIZATION_STATUSES)[number];

  @IsString()
  reason!: string;
}
