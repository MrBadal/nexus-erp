import { IsOptional, IsString } from 'class-validator';

export class RejectLeaveDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
