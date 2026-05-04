import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  IsInt,
  IsIn,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export const ONBOARDING_DEFAULT_ASSIGNEES = ['hr', 'manager', 'employee', 'it', 'admin'] as const;
export type OnboardingDefaultAssignee = (typeof ONBOARDING_DEFAULT_ASSIGNEES)[number];

export const ONBOARDING_TASK_STATUSES = ['pending', 'done', 'skipped'] as const;
export type OnboardingTaskStatus = (typeof ONBOARDING_TASK_STATUSES)[number];

export const ONBOARDING_CHECKLIST_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'overdue',
] as const;

export class CreateOnboardingTemplateTaskDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sequence?: number;

  @IsOptional()
  @IsIn(ONBOARDING_DEFAULT_ASSIGNEES as readonly string[])
  defaultAssignee?: OnboardingDefaultAssignee;

  @IsOptional()
  @IsInt()
  @Min(0)
  dueDays?: number;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}

export class CreateOnboardingTemplateDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsUUID()
  designationId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOnboardingTemplateTaskDto)
  tasks?: CreateOnboardingTemplateTaskDto[];
}

export class UpdateOnboardingTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsUUID()
  designationId?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOnboardingTemplateTaskDto)
  tasks?: CreateOnboardingTemplateTaskDto[];
}

export class CreateChecklistFromTemplateDto {
  @IsUUID()
  employeeId!: string;

  @IsUUID()
  templateId!: string;
}

export class UpdateOnboardingTaskStatusDto {
  @IsIn(ONBOARDING_TASK_STATUSES as readonly string[])
  status!: OnboardingTaskStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
