import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateEducationDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  @MaxLength(100)
  degree!: string;

  @IsString()
  @MaxLength(255)
  institution!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldOfStudy?: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  startYear!: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  endYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
