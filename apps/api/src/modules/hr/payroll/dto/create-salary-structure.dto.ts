import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalaryStructureComponentDto {
  @IsUUID()
  componentId!: string;

  @IsOptional()
  @IsString()
  formula?: string;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  percentage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  basedOn?: string;
}

export class CreateSalaryStructureDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryStructureComponentDto)
  components?: SalaryStructureComponentDto[];
}
