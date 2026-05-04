import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { HolidayService } from './holiday.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateHolidayDto } from './dto/create-holiday.dto.js';
import { UpdateHolidayDto } from './dto/update-holiday.dto.js';

@ApiTags('hr-holidays')
@ApiBearerAuth()
@Controller('hr/holidays')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Get()
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List holidays (optionally filter by year)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of holidays' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('year') year?: string,
  ) {
    if (year !== undefined && year !== null && year !== '') {
      const yr = Number(year);
      if (Number.isFinite(yr)) {
        return this.holidayService.listForYear(tenantId, yr);
      }
    }
    return this.holidayService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get holiday by ID' })
  @ApiResponse({ status: 200, description: 'Holiday details' })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.holidayService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a holiday' })
  @ApiResponse({ status: 201, description: 'Holiday created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateHolidayDto,
  ) {
    return this.holidayService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update a holiday' })
  @ApiResponse({ status: 200, description: 'Holiday updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateHolidayDto,
  ) {
    return this.holidayService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a holiday (soft delete)' })
  @ApiResponse({ status: 200, description: 'Holiday deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.holidayService.remove(tenantId, id);
  }
}
