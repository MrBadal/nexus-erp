import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsIn,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Review Cycles ──────────────────────────────────────

export class CreateCycleDto {
  @IsString()
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class UpdateCycleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['draft', 'open', 'review', 'closed'])
  status?: 'draft' | 'open' | 'review' | 'closed';
}

// ─── KRA Templates ──────────────────────────────────────

export class KraItemDto {
  @IsString()
  title!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;

  @IsString()
  target!: string;
}

export class CreateKraTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsUUID()
  designationId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KraItemDto)
  kras!: KraItemDto[];
}

export class UpdateKraTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  designationId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KraItemDto)
  kras?: KraItemDto[];
}

// ─── Goals ──────────────────────────────────────────────

export class CreateGoalDto {
  @IsUUID()
  cycleId!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsString()
  target?: string;
}

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  achievement?: string;

  @IsOptional()
  @IsIn(['draft', 'active', 'completed'])
  status?: 'draft' | 'active' | 'completed';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  selfRating?: number;
}

export class ManagerCommentGoalDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  managerRating?: number;

  @IsOptional()
  @IsString()
  managerComment?: string;
}

// ─── Reviews ────────────────────────────────────────────

export class SubmitReviewDto {
  @IsUUID()
  cycleId!: string;

  @IsUUID()
  employeeId!: string;

  @IsIn(['self', 'manager', 'peer'])
  role!: 'self' | 'manager' | 'peer';

  @IsObject()
  responses!: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  overallRating?: number;
}

export class CompetencyRatingDto {
  @IsString()
  competency!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  selfRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  managerRating?: number;
}

export class SubmitCompetenciesDto {
  @IsUUID()
  cycleId!: string;

  @IsUUID()
  employeeId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetencyRatingDto)
  competencies!: CompetencyRatingDto[];
}
