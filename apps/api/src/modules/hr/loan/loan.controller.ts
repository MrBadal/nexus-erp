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
import { LoanService } from './loan.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { UpdateLoanDto } from './dto/update-loan.dto.js';
import { RecordRepaymentDto } from './dto/record-repayment.dto.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('loans')
@ApiBearerAuth()
@Controller('hr/loans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LoanController {
  constructor(private readonly service: LoanService) {}

  @Get()
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List loans & advances' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(tenantId, { status, employeeId, type, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get loan by ID with repayments' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a loan or advance' })
  @ApiResponse({ status: 201, description: 'Loan created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateLoanDto,
  ) {
    return this.service.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update a pending loan' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateLoanDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Post(':id/approve')
  @RequirePermissions('hr:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve and disburse a loan' })
  async approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.approve(tenantId, id, user.userId);
  }

  @Post(':id/reject')
  @RequirePermissions('hr:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a loan' })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.reject(tenantId, id);
  }

  @Post(':id/repayment')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a loan repayment' })
  async recordRepayment(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: RecordRepaymentDto,
  ) {
    return this.service.recordRepayment(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('hr:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a loan' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }
}

// ─── ESS (Employee Self-Service) ─────────────────────────

@ApiTags('ess-loans')
@ApiBearerAuth()
@Controller('ess/loans')
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EssLoanController {
  constructor(private readonly service: LoanService) {}

  @Get()
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: 'List my own loans & advances' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(tenantId, {
      employeeId: user.employeeId!,
      status,
      type,
      limit,
      offset,
    });
  }

  @Post()
  @ScopeToSelf()
  @RequirePermissions('ess:submit_expense')
  @ApiOperation({ summary: 'Apply for a loan or advance for myself' })
  async applyMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Omit<CreateLoanDto, 'employeeId'>,
  ) {
    return this.service.create(tenantId, {
      ...body,
      employeeId: user.employeeId!,
    } as CreateLoanDto);
  }
}
