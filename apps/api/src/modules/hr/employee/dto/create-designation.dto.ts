import {
  IsString,
  IsOptional,
  IsInt,
  MaxLength,
} from 'class-validator';

export class CreateDesignationDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  level?: number;
}
