import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class AssignAssetDto {
  @IsUUID()
  @IsNotEmpty()
  assetId!: string;

  @IsUUID()
  @IsNotEmpty()
  employeeId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  conditionAtAssign?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
