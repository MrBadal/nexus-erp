import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
  MaxLength,
} from 'class-validator';

export class UpdateNcrDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  inspectionId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['minor', 'major', 'critical'])
  severity?: string;

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
