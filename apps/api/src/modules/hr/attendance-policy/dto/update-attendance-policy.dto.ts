import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
  IsNumberString,
} from 'class-validator';

export class UpdateAttendancePolicyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  graceMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lateThresholdMinutes?: number;

  @IsOptional()
  @IsNumberString()
  deductionPerInstance?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyToleranceCount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
