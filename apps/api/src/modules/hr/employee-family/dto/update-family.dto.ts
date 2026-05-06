import { PartialType } from '@nestjs/swagger';
import { CreateFamilyDto } from './create-family.dto.js';

export class UpdateFamilyDto extends PartialType(CreateFamilyDto) {}
