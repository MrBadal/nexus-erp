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
import { ContactService } from './contact.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';
import { CreateContactGroupDto } from './dto/create-contact-group.dto.js';

@ApiTags('crm-contacts')
@ApiBearerAuth()
@Controller('crm/contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @RequirePermissions('contacts:read')
  @ApiOperation({ summary: 'List contacts with filters' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'group_id', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'assigned_to', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'sort_by', required: false })
  @ApiQuery({ name: 'sort_order', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of contacts' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('group_id') groupId?: string,
    @Query('search') search?: string,
    @Query('assigned_to') assignedTo?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    return this.contactService.findAll(tenantId, {
      type,
      status,
      source,
      groupId,
      search,
      assignedTo,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @RequirePermissions('contacts:read')
  @ApiOperation({ summary: 'Get contact by ID' })
  @ApiResponse({ status: 200, description: 'Contact details with groups' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.contactService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('contacts:write')
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, description: 'Contact created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateContactDto,
  ) {
    return this.contactService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('contacts:write')
  @ApiOperation({ summary: 'Update contact' })
  @ApiResponse({ status: 200, description: 'Contact updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateContactDto,
  ) {
    return this.contactService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('contacts:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete contact' })
  @ApiResponse({ status: 204, description: 'Contact deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.contactService.softDelete(tenantId, id);
  }

  @Post(':id/groups/:groupId')
  @RequirePermissions('contacts:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add contact to a group' })
  @ApiResponse({ status: 200, description: 'Contact added to group' })
  async addToGroup(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Param('groupId', UuidValidationPipe) groupId: string,
  ) {
    return this.contactService.addToGroup(tenantId, id, groupId);
  }

  @Delete(':id/groups/:groupId')
  @RequirePermissions('contacts:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove contact from a group' })
  @ApiResponse({ status: 204, description: 'Contact removed from group' })
  async removeFromGroup(
    @Param('id', UuidValidationPipe) id: string,
    @Param('groupId', UuidValidationPipe) groupId: string,
  ) {
    return this.contactService.removeFromGroup(id, groupId);
  }
}

@ApiTags('crm-contact-groups')
@ApiBearerAuth()
@Controller('crm/contact-groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContactGroupController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @RequirePermissions('contacts:read')
  @ApiOperation({ summary: 'List all contact groups' })
  @ApiResponse({ status: 200, description: 'List of contact groups' })
  async findAllGroups(@CurrentTenant() tenantId: string) {
    return this.contactService.findAllGroups(tenantId);
  }

  @Post()
  @RequirePermissions('contacts:write')
  @ApiOperation({ summary: 'Create a contact group' })
  @ApiResponse({ status: 201, description: 'Contact group created' })
  async createGroup(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateContactGroupDto,
  ) {
    return this.contactService.createGroup(tenantId, body);
  }
}
