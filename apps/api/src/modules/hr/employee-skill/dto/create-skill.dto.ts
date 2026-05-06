import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
  IsNumberString,
  MaxLength,
} from 'class-validator';

export const EMPLOYEE_SKILL_PROFICIENCIES = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
] as const;

export type EmployeeSkillProficiency =
  (typeof EMPLOYEE_SKILL_PROFICIENCIES)[number];

export class CreateSkillDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  @MaxLength(150)
  skill!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsIn(EMPLOYEE_SKILL_PROFICIENCIES)
  proficiency!: EmployeeSkillProficiency;

  @IsOptional()
  @IsNumberString({ no_symbols: false }, { message: 'yearsOfExperience must be a numeric string' })
  yearsOfExperience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  certificationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  certificationIssuer?: string;

  @IsOptional()
  @IsDateString()
  certificationDate?: string;

  @IsOptional()
  @IsDateString()
  certificationExpiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
