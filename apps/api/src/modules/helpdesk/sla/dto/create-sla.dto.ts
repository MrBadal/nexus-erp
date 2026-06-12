import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsIn,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class CreateSlaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority!: string;

  @IsInt()
  @Min(1)
  firstResponseHours!: number;

  @IsInt()
  @Min(1)
  resolutionHours!: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsUUID()
  @IsOptional()
  escalateTo?: string;
}
