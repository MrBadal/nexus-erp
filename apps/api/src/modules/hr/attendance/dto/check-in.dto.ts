import {
  IsUUID,
  IsOptional,
  IsString,
} from 'class-validator';

export class CheckInDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
