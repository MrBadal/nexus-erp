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
import { ExpenseClaimService, CreateExpenseClaimDto, UpdateExpenseClaimDto } from './expense-claim.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('expense-claims')
@ApiBearerAuth()
@Controller('hr/expense-claims')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseClaimController {
  constructor(private readonly service: ExpenseClaimService) {}

  @Get()
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List expense claims' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(tenantId, { status, employeeId, search, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get expense claim by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create an expense claim' })
  @ApiResponse({ status: 201, description: 'Expense claim created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateExpenseClaimDto,
  ) {
    return this.service.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update an expense claim' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateExpenseClaimDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Post(':id/submit')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit an expense claim for approval' })
  async submit(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.updateStatus(tenantId, id, 'submitted');
  }

  @Post(':id/approve')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an expense claim' })
  async approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.updateStatus(tenantId, id, 'approved', user.userId);
  }

  @Post(':id/reject')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an expense claim' })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.updateStatus(tenantId, id, 'rejected');
  }

  @Post(':id/pay')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark expense claim as paid and create GL journal' })
  async pay(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.updateStatus(tenantId, id, 'paid');
  }

  @Delete(':id')
  @RequirePermissions('hr:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an expense claim' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }
}

// ─── ESS (Employee Self-Service) ─────────────────────────

@ApiTags('ess-expenses')
@ApiBearerAuth()
@Controller('ess/expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EssExpenseClaimController {
  constructor(private readonly service: ExpenseClaimService) {}

  @Get()
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: 'List my own expense claims' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(tenantId, {
      employeeId: user.employeeId!,
      status,
      limit,
      offset,
    });
  }

  @Post()
  @ScopeToSelf()
  @RequirePermissions('ess:submit_expense')
  @ApiOperation({ summary: 'Submit a new expense claim for myself' })
  async createMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Omit<CreateExpenseClaimDto, 'employeeId'>,
  ) {
    return this.service.create(tenantId, {
      ...body,
      employeeId: user.employeeId!,
    } as CreateExpenseClaimDto);
  }
}
