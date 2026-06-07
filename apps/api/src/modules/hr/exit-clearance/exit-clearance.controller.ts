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
import { ExitClearanceService } from './exit-clearance.service.js';
import { CreateExitClearanceDto } from './dto/create-exit-clearance.dto.js';
import { UpdateExitClearanceDto } from './dto/update-exit-clearance.dto.js';
import { SettleDto } from './dto/settle.dto.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('exit-clearances')
@ApiBearerAuth()
@Controller('hr/exit-clearances')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExitClearanceController {
  constructor(private readonly service: ExitClearanceService) {}

  @Get()
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List exit clearances' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(tenantId, { status, employeeId, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get exit clearance by ID with its final settlement' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create an exit clearance' })
  @ApiResponse({ status: 201, description: 'Exit clearance created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateExitClearanceDto,
  ) {
    return this.service.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update an exit clearance and its clearance checkpoints' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateExitClearanceDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Post(':id/settle')
  @RequirePermissions('hr:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compute and record the full-and-final settlement' })
  async settle(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: SettleDto,
  ) {
    return this.service.settle(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('hr:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an exit clearance' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }
}
