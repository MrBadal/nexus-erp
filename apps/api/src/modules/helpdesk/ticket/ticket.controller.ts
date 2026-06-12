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
import { TicketService } from './ticket.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto, CreateTicketCommentDto } from './dto/update-ticket.dto.js';

@ApiTags('helpdesk-tickets')
@ApiBearerAuth()
@Controller('helpdesk')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get('tickets')
  @RequirePermissions('helpdesk:read')
  @ApiOperation({ summary: 'List tickets with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of tickets' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.ticketService.findAll(tenantId, { status, priority, assignedTo, search, limit, offset });
  }

  @Get('tickets/:id')
  @RequirePermissions('helpdesk:read')
  @ApiOperation({ summary: 'Get ticket by ID with comments' })
  @ApiResponse({ status: 200, description: 'Ticket details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ticketService.findById(tenantId, id);
  }

  @Post('tickets')
  @RequirePermissions('helpdesk:write')
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateTicketDto,
  ) {
    return this.ticketService.create(tenantId, body);
  }

  @Put('tickets/:id')
  @RequirePermissions('helpdesk:write')
  @ApiOperation({ summary: 'Update a ticket' })
  @ApiResponse({ status: 200, description: 'Ticket updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateTicketDto,
  ) {
    return this.ticketService.update(tenantId, id, body);
  }

  @Post('tickets/:id/comments')
  @RequirePermissions('helpdesk:write')
  @ApiOperation({ summary: 'Add a comment to a ticket' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addComment(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: CreateTicketCommentDto,
  ) {
    return this.ticketService.addComment(tenantId, id, body);
  }

  @Post('tickets/:id/resolve')
  @RequirePermissions('helpdesk:write')
  @ApiOperation({ summary: 'Resolve a ticket' })
  @ApiResponse({ status: 200, description: 'Ticket resolved' })
  async resolve(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ticketService.updateStatus(tenantId, id, 'resolved');
  }

  @Post('tickets/:id/close')
  @RequirePermissions('helpdesk:write')
  @ApiOperation({ summary: 'Close a ticket' })
  @ApiResponse({ status: 200, description: 'Ticket closed' })
  async close(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ticketService.updateStatus(tenantId, id, 'closed');
  }

  @Post('tickets/:id/reopen')
  @RequirePermissions('helpdesk:write')
  @ApiOperation({ summary: 'Reopen a closed or resolved ticket' })
  @ApiResponse({ status: 200, description: 'Ticket reopened' })
  async reopen(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ticketService.updateStatus(tenantId, id, 'open');
  }

  @Delete('tickets/:id')
  @RequirePermissions('helpdesk:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a ticket' })
  @ApiResponse({ status: 204, description: 'Ticket deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ticketService.softDelete(tenantId, id);
  }
}
