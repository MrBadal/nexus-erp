import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List all users in the current tenant' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.userService.findAll(tenantId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getProfile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userService.findById(tenantId, user.sub);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.userService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('users:write')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.userService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('users:write')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: any,
  ) {
    return this.userService.update(tenantId, id, body);
  }

  @Put('me/password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changePassword(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.userService.changePassword(
      tenantId,
      user.sub,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.userService.softDelete(tenantId, id);
  }

  @Post(':id/issue-reset-link')
  @RequirePermissions('users:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue a one-time activation/reset link for the user (admin-shared)',
    description:
      'Generates a 7-day password-reset JWT and returns a URL the admin can hand to the user. Used both for first-time activation and for password resets when no email infrastructure is wired up.',
  })
  async issueResetLink(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.userService.issueResetLink(tenantId, id);
  }
}
