import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class UpdateBomDto {
  @IsString()
  @IsOptional()
  quantity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  uom?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
