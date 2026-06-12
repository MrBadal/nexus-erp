import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
  MaxLength,
} from 'class-validator';

export class CreateNcrDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  inspectionId?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['minor', 'major', 'critical'])
  severity!: string;

  @IsString()
  @IsOptional()
  rootCause?: string;

  @IsString()
  @IsOptional()
  correctiveAction?: string;

  @IsString()
  @IsOptional()
  preventiveAction?: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
