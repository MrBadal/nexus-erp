import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmployeeService } from './employee.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { CreateDesignationDto } from './dto/create-designation.dto.js';

@ApiTags('hr-employees')
@ApiBearerAuth()
@Controller('hr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  // ─── Employees ────────────────────────────────────────

  @Get('employees/org-chart')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get organisation chart as a recursive tree' })
  @ApiResponse({ status: 200, description: 'Org chart tree built from manager relationships' })
  async getOrgChart(@CurrentTenant() tenantId: string) {
    return this.employeeService.getOrgChart(tenantId);
  }

  @Get('employees/:id/team')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: "Get an employee's manager, peers, and direct reports" })
  @ApiResponse({ status: 200, description: 'Manager, peers, direct reports' })
  async getTeam(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.employeeService.getTeam(tenantId, id);
  }

  @Get('employees')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List employees with optional filters' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'employmentType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of employees' })
  async findAllEmployees(
    @CurrentTenant() tenantId: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('employmentType') employmentType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.employeeService.findAllEmployees(tenantId, {
      departmentId,
      status,
      employmentType,
      search,
      limit,
      offset,
    });
  }

  @Get('employees/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiResponse({ status: 200, description: 'Employee details' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findEmployeeById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.employeeService.findEmployeeById(tenantId, id);
  }

  @Post('employees')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({ status: 201, description: 'Employee created' })
  @ApiResponse({ status: 409, description: 'Email conflict' })
  async createEmployee(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateEmployeeDto,
  ) {
    return this.employeeService.createEmployee(tenantId, body);
  }

  @Put('employees/:id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update an employee' })
  @ApiResponse({ status: 200, description: 'Employee updated' })
  async updateEmployee(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateEmployeeDto,
  ) {
    return this.employeeService.updateEmployee(tenantId, id, body);
  }

  @Delete('employees/:id')
  @RequirePermissions('hr:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an employee' })
  @ApiResponse({ status: 204, description: 'Employee deleted' })
  async removeEmployee(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.employeeService.softDeleteEmployee(tenantId, id);
  }

  @Post('employees/:id/invite-to-portal')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create/refresh the login account linked to this employee',
    description:
      'Provisions a User account with the employee role linked to this employee record, and returns a one-time activation URL the admin shares with the employee. If a user with the same email already exists, it is linked and a fresh reset link is issued.',
  })
  @ApiResponse({ status: 200, description: 'Activation URL issued' })
  async inviteEmployeeToPortal(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.employeeService.inviteEmployeeToPortal(tenantId, id);
  }

  // ─── Departments ──────────────────────────────────────

  @Get('departments')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List departments as a tree' })
  @ApiResponse({ status: 200, description: 'Department tree' })
  async findAllDepartments(@CurrentTenant() tenantId: string) {
    return this.employeeService.getDepartmentTree(tenantId);
  }

  @Get('departments/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get a department by ID' })
  @ApiResponse({ status: 200, description: 'Department' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async findDepartmentById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.employeeService.findDepartmentById(tenantId, id);
  }

  @Post('departments')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a new department' })
  @ApiResponse({ status: 201, description: 'Department created' })
  @ApiResponse({ status: 409, description: 'Department code conflict' })
  async createDepartment(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateDepartmentDto,
  ) {
    return this.employeeService.createDepartment(tenantId, body);
  }

  @Put('departments/:id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update a department' })
  @ApiResponse({ status: 200, description: 'Department updated' })
  async updateDepartment(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: CreateDepartmentDto,
  ) {
    return this.employeeService.updateDepartment(tenantId, id, body);
  }

  @Delete('departments/:id')
  @RequirePermissions('hr:delete')
  @ApiOperation({ summary: 'Soft-delete a department' })
  @ApiResponse({ status: 200, description: 'Department deleted' })
  @ApiResponse({ status: 400, description: 'Department has sub-departments or assigned employees' })
  async deleteDepartment(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.employeeService.deleteDepartment(tenantId, id);
  }

  // ─── Designations ────────────────────────────────────

  @Get('designations')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List designations' })
  @ApiResponse({ status: 200, description: 'List of designations' })
  async findAllDesignations(@CurrentTenant() tenantId: string) {
    return this.employeeService.findAllDesignations(tenantId);
  }

  @Get('designations/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get a designation by ID' })
  @ApiResponse({ status: 200, description: 'Designation' })
  @ApiResponse({ status: 404, description: 'Designation not found' })
  async findDesignationById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.employeeService.findDesignationById(tenantId, id);
  }

  @Post('designations')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a new designation' })
  @ApiResponse({ status: 201, description: 'Designation created' })
  async createDesignation(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateDesignationDto,
  ) {
    return this.employeeService.createDesignation(tenantId, body);
  }

  @Put('designations/:id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update a designation' })
  @ApiResponse({ status: 200, description: 'Designation updated' })
  async updateDesignation(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: CreateDesignationDto,
  ) {
    return this.employeeService.updateDesignation(tenantId, id, body);
  }

  @Delete('designations/:id')
  @RequirePermissions('hr:delete')
  @ApiOperation({ summary: 'Soft-delete a designation' })
  @ApiResponse({ status: 200, description: 'Designation deleted' })
  @ApiResponse({ status: 400, description: 'Designation in use by employees' })
  async deleteDesignation(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.employeeService.deleteDesignation(tenantId, id);
  }
}

// ─── ESS (Employee Self-Service) ─────────────────────────

@ApiTags('ess-profile')
@ApiBearerAuth()
@Controller('ess')
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EssProfileController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('profile')
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: 'Get my employee profile' })
  async getMyProfile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeeService.getMyProfile(tenantId, user.employeeId!);
  }

  @Patch('profile')
  @ScopeToSelf()
  @RequirePermissions('ess:write')
  @ApiOperation({
    summary:
      'Update my own profile (whitelist: phone, currentAddress, emergencyContactName, emergencyContactPhone)',
  })
  async updateMyProfile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.employeeService.updateMyProfile(tenantId, user.employeeId!, body);
  }

  @Get('team')
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: 'Get my manager, peers and direct reports' })
  async getMyTeam(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeeService.getMyTeam(tenantId, user.employeeId!);
  }

  @Get('dashboard')
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: 'Aggregate dashboard data for the ESS home page' })
  async getDashboard(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeeService.getEssDashboard(tenantId, user.employeeId!);
  }
}
