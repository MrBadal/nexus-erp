import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateWorkOrderDto {
  @IsString()
  @IsOptional()
  quantity?: string;

  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  warehouse?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
