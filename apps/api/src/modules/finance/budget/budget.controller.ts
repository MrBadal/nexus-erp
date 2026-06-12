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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BudgetService, CreateBudgetDto, UpdateBudgetDto } from './budget.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('budgets')
@ApiBearerAuth()
@Controller('finance/budgets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'List budgets' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(tenantId, { status, fiscalYear, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Get budget by ID with line items' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Create a budget' })
  @ApiResponse({ status: 201, description: 'Budget created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Body() body: CreateBudgetDto,
  ) {
    return this.service.create(tenantId, user.userId, body);
  }

  @Put(':id')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Update a budget' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateBudgetDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Post(':id/activate')
  @RequirePermissions('finance:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a draft budget' })
  async activate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.activate(tenantId, id);
  }

  @Post(':id/close')
  @RequirePermissions('finance:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an active budget' })
  async close(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.close(tenantId, id);
  }

  @Post(':id/refresh-actuals')
  @RequirePermissions('finance:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh actual amounts from posted journal entries' })
  async refreshActuals(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.refreshActuals(tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('finance:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a budget' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }
}
