import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsEnum,
  IsISO8601,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { AnnouncementAudienceScope } from './create-announcement.dto.js';

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsEnum(['tenant', 'department', 'designation', 'specific'])
  audienceScope?: AnnouncementAudienceScope;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  audienceIds?: string[];

  @IsOptional()
  @IsISO8601()
  publishedAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
