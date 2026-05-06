import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
