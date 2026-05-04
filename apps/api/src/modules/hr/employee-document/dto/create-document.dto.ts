import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsInt,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';

export const EMPLOYEE_DOCUMENT_TYPES = [
  'offer_letter',
  'contract',
  'id_proof',
  'certificate',
  'payslip_archive',
  'other',
] as const;

export type EmployeeDocumentType = (typeof EMPLOYEE_DOCUMENT_TYPES)[number];

export class CreateDocumentDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(EMPLOYEE_DOCUMENT_TYPES)
  type!: EmployeeDocumentType;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  visibleToEmployee?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
