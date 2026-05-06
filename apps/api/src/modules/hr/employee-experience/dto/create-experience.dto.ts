import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateExperienceDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  @MaxLength(255)
  companyName!: string;

  @IsString()
  @MaxLength(150)
  title!: string;

  @IsDateString()
  fromDate!: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  employmentType?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
