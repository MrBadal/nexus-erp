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
import { TimesheetService } from './timesheet.service.js';
import { TimesheetBillingService } from '../../shared/timesheet-billing.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateTimesheetDto } from './dto/create-timesheet.dto.js';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto.js';

@ApiTags('projects-timesheets')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TimesheetController {
  constructor(
    private readonly timesheetService: TimesheetService,
    private readonly billingService: TimesheetBillingService,
  ) {}

  @Get('timesheets')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'List timesheets with filters' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of timesheets' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('projectId') projectId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.timesheetService.findAll(tenantId, { projectId, employeeId, status, search, limit, offset });
  }

  @Get('timesheets/:id')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'Get timesheet by ID' })
  @ApiResponse({ status: 200, description: 'Timesheet details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.timesheetService.findById(tenantId, id);
  }

  @Post('timesheets')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Create a new timesheet entry' })
  @ApiResponse({ status: 201, description: 'Timesheet created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateTimesheetDto,
  ) {
    return this.timesheetService.create(tenantId, body);
  }

  @Put('timesheets/:id')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Update a timesheet entry' })
  @ApiResponse({ status: 200, description: 'Timesheet updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateTimesheetDto,
  ) {
    return this.timesheetService.update(tenantId, id, body);
  }

  @Post('timesheets/:id/submit')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Submit a timesheet for approval' })
  @ApiResponse({ status: 200, description: 'Timesheet submitted' })
  async submit(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.timesheetService.updateStatus(tenantId, id, 'submitted');
  }

  @Post('timesheets/:id/approve')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Approve a timesheet' })
  @ApiResponse({ status: 200, description: 'Timesheet approved' })
  async approve(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.timesheetService.updateStatus(tenantId, id, 'approved');
  }

  @Post('timesheets/:id/reject')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Reject a timesheet' })
  @ApiResponse({ status: 200, description: 'Timesheet rejected' })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.timesheetService.updateStatus(tenantId, id, 'rejected');
  }

  @Delete('timesheets/:id')
  @RequirePermissions('projects:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a timesheet' })
  @ApiResponse({ status: 204, description: 'Timesheet deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.timesheetService.softDelete(tenantId, id);
  }

  // ─── Billing ────────────────────────────────────────────────────

  @Get('timesheets/billing-summary/:projectId')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'Get billing summary for unbilled approved timesheets' })
  @ApiResponse({ status: 200, description: 'Billing summary' })
  async getBillingSummary(
    @CurrentTenant() tenantId: string,
    @Param('projectId', UuidValidationPipe) projectId: string,
  ) {
    return this.billingService.getBillingSummary(tenantId, projectId);
  }

  @Post('timesheets/create-invoice')
  @RequirePermissions('projects:write', 'finance:write')
  @ApiOperation({ summary: 'Create invoice from approved timesheets for a project' })
  @ApiResponse({ status: 201, description: 'Invoice created from timesheets' })
  async createInvoiceFromTimesheets(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { projectId: string; customerId: string },
  ) {
    return this.billingService.createInvoiceFromTimesheets(
      tenantId,
      body.projectId,
      body.customerId,
      user.sub,
    );
  }
}
