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

export const OFFBOARDING_DEFAULT_ASSIGNEES = ['hr', 'manager', 'employee', 'it', 'admin'] as const;
export type OffboardingDefaultAssignee = (typeof OFFBOARDING_DEFAULT_ASSIGNEES)[number];

export const OFFBOARDING_TASK_STATUSES = ['pending', 'done', 'skipped'] as const;
export type OffboardingTaskStatus = (typeof OFFBOARDING_TASK_STATUSES)[number];

export const OFFBOARDING_CHECKLIST_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'overdue',
] as const;

export class CreateOffboardingTemplateTaskDto {
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
  @IsIn(OFFBOARDING_DEFAULT_ASSIGNEES as readonly string[])
  defaultAssignee?: OffboardingDefaultAssignee;

  @IsOptional()
  @IsInt()
  @Min(0)
  dueDays?: number;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}

export class CreateOffboardingTemplateDto {
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
  @Type(() => CreateOffboardingTemplateTaskDto)
  tasks?: CreateOffboardingTemplateTaskDto[];
}

export class UpdateOffboardingTemplateDto {
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
  @Type(() => CreateOffboardingTemplateTaskDto)
  tasks?: CreateOffboardingTemplateTaskDto[];
}

export class CreateOffboardingChecklistFromTemplateDto {
  @IsUUID()
  employeeId!: string;

  @IsUUID()
  templateId!: string;
}

export class UpdateOffboardingTaskStatusDto {
  @IsIn(OFFBOARDING_TASK_STATUSES as readonly string[])
  status!: OffboardingTaskStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
