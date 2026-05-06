import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsInt,
  IsIn,
  Min,
  Max,
  Matches,
  MaxLength,
} from 'class-validator';

export const EMPLOYEE_FAMILY_RELATIONSHIPS = [
  'spouse',
  'father',
  'mother',
  'son',
  'daughter',
  'sibling',
  'other',
] as const;

export type EmployeeFamilyRelationship =
  (typeof EMPLOYEE_FAMILY_RELATIONSHIPS)[number];

export class CreateFamilyDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsIn(EMPLOYEE_FAMILY_RELATIONSHIPS)
  relationship!: EmployeeFamilyRelationship;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsBoolean()
  nominee?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  nomineeSharePercent?: number;

  @IsOptional()
  @Matches(/^[2-9][0-9]{11}$/, {
    message: 'Aadhaar must be a 12-digit number not starting with 0 or 1',
  })
  aadhaarNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
