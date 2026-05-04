import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ReturnAssetDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  conditionAtReturn?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
