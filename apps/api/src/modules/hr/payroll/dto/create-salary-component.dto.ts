import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';

export class CreateSalaryComponentDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(50)
  code!: string;

  @IsEnum(['earning', 'deduction'])
  type!: string;

  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
