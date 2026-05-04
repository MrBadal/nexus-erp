import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  IsArray,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';

export type HolidayType = 'national' | 'state' | 'company' | 'restricted';

export class CreateHolidayDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsEnum(['national', 'state', 'company', 'restricted'])
  type?: HolidayType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
