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
import { CustomerService } from './customer.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@ApiTags('selling-customers')
@ApiBearerAuth()
@Controller('selling')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('customers')
  @RequirePermissions('selling:read')
  @ApiOperation({ summary: 'List customers with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of customers' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('customerType') customerType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.customerService.findAll(tenantId, {
      status,
      customerType,
      search,
      limit,
      offset,
    });
  }

  @Get('customers/:id')
  @RequirePermissions('selling:read')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer details' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.customerService.findById(tenantId, id);
  }

  @Post('customers')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateCustomerDto,
  ) {
    return this.customerService.create(tenantId, body);
  }

  @Put('customers/:id')
  @RequirePermissions('selling:write')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateCustomerDto,
  ) {
    return this.customerService.update(tenantId, id, body);
  }

  @Delete('customers/:id')
  @RequirePermissions('selling:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a customer' })
  @ApiResponse({ status: 204, description: 'Customer deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.customerService.softDelete(tenantId, id);
  }
}
