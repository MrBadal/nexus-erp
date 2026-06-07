import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateLeaveTypeDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultDays?: number;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  isCarryForward?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxCarryForwardDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
