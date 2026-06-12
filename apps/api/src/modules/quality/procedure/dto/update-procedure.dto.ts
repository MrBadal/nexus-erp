import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class UpdateProcedureDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  processOwner?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  steps?: string;
}
