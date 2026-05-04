import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PayrollService } from './payroll.service.js';
import { PayslipPdfService } from './payslip-pdf.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto.js';
import { CreateSalaryComponentDto } from './dto/create-salary-component.dto.js';
import { ProcessPayrollDto } from './dto/process-payroll.dto.js';

@ApiTags('hr-payroll')
@ApiBearerAuth()
@Controller('hr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // ─── Salary Structures ──────────────────────────────────

  @Get('salary-structures')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List salary structures' })
  @ApiResponse({ status: 200, description: 'List of salary structures' })
  async findAllSalaryStructures(@CurrentTenant() tenantId: string) {
    return this.payrollService.findAllSalaryStructures(tenantId);
  }

  @Post('salary-structures')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a salary structure with components' })
  @ApiResponse({ status: 201, description: 'Salary structure created' })
  async createSalaryStructure(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateSalaryStructureDto,
  ) {
    return this.payrollService.createSalaryStructure(tenantId, body);
  }

  // ─── Salary Components ──────────────────────────────────

  @Get('salary-components')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List salary components' })
  @ApiResponse({ status: 200, description: 'List of salary components' })
  async findAllSalaryComponents(@CurrentTenant() tenantId: string) {
    return this.payrollService.findAllSalaryComponents(tenantId);
  }

  @Post('salary-components')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a salary component' })
  @ApiResponse({ status: 201, description: 'Salary component created' })
  @ApiResponse({ status: 409, description: 'Component code conflict' })
  async createSalaryComponent(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateSalaryComponentDto,
  ) {
    return this.payrollService.createSalaryComponent(tenantId, body);
  }

  // ─── Payroll Processing ─────────────────────────────────

  @Post('payroll/process')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process payroll for a period' })
  @ApiResponse({ status: 200, description: 'Payroll processed' })
  async processPayroll(
    @CurrentTenant() tenantId: string,
    @Body() body: ProcessPayrollDto,
  ) {
    return this.payrollService.processPayroll(tenantId, body);
  }

  // ─── Payroll Entries ────────────────────────────────────

  @Get('payroll/entries')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List payroll entries' })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of payroll entries' })
  async findAllPayrollEntries(
    @CurrentTenant() tenantId: string,
    @Query('period') period?: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.payrollService.findAllPayrollEntries(tenantId, {
      period,
      status,
      employeeId,
      limit,
      offset,
    });
  }

  @Get('payroll/entries/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get payroll entry with component breakdown' })
  @ApiResponse({ status: 200, description: 'Payroll entry details' })
  @ApiResponse({ status: 404, description: 'Payroll entry not found' })
  async findPayrollEntryById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.payrollService.findPayrollEntryById(tenantId, id);
  }

  @Post('payroll/entries/:id/approve')
  @RequirePermissions('hr:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a payroll entry' })
  @ApiResponse({ status: 200, description: 'Payroll entry approved' })
  async approvePayrollEntry(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.payrollService.approvePayrollEntry(tenantId, id);
  }
}

// ─── ESS (Employee Self-Service) ─────────────────────────

@ApiTags('ess-payroll')
@ApiBearerAuth()
@Controller('ess/payroll')
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EssPayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly payslipPdfService: PayslipPdfService,
  ) {}

  @Get('entries')
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: 'List my own payroll entries (payslips)' })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listMyEntries(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.payrollService.findAllPayrollEntries(tenantId, {
      employeeId: user.employeeId!,
      period,
      limit,
      offset,
    });
  }

  @Get('entries/:id/pdf')
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: 'Download my payslip as a PDF' })
  async downloadPayslip(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Res() res: Response,
  ) {
    // Confirm ownership; throws if not theirs
    await this.payrollService.findMyPayrollEntryById(tenantId, user.employeeId!, id);

    const buffer = await this.payslipPdfService.generate({
      tenantId,
      employeeId: user.employeeId!,
      payrollEntryId: id,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payslip-${id}.pdf"`,
    );
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }
}
