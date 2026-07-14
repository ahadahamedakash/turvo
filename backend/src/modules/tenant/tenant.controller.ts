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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '@src/common/guard/jwt-auth.guard';
import { SuperAdminGuard } from '@src/common/guards/super-admin.guard';
import { GetUser } from '@src/common/decorators/get-user.decorator';
import {
  ThrottleHourly,
  ThrottleMedium,
} from '@src/common/decorators/throttle.decorator';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { QueryTenantDto } from './dto/query-tenant.dto';
import {
  TenantResponseDto,
  TenantListResponseDto,
} from './dto/tenant-response.dto';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Create a new tenant (Super Admin only)
   */
  @Post()
  @ThrottleHourly() // Rate limiting: 20 requests per hour
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new tenant',
    description:
      'Creates a new tenant/organization. Only super admins can create tenants. ' +
      'The creating super admin automatically becomes a member with admin role for the new tenant.',
  })
  @ApiBody({ type: CreateTenantDto })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    schema: {
      type: 'object',
      properties: {
        tenant: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
        initialAdmin: {
          type: 'object',
          properties: {
            tenantMemberId: { type: 'string' },
            userId: { type: 'string' },
            role: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid data, slug already exists)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super admin access required',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Tenant with this slug already exists',
  })
  async create(
    @Body() createTenantDto: CreateTenantDto,
    @GetUser('id') superAdminId: string,
  ) {
    return this.tenantService.create(createTenantDto, superAdminId);
  }

  /**
   * Get all tenants (Super Admin only)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all tenants',
    description:
      'Returns a paginated list of all tenants. Only super admins can view all tenants. ' +
      'Supports filtering by status and searching by name/slug.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['Active', 'Inactive', 'Suspended'],
    description: 'Filter by tenant status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or slug',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tenants',
    type: TenantListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super admin access required',
  })
  async findAll(@Query() query: QueryTenantDto) {
    return this.tenantService.findAll(query);
  }

  /**
   * Get a single tenant by ID (Super Admin only)
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get tenant by ID',
    description:
      'Returns detailed information about a specific tenant including counts of members, courts, bookings, and customers.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant details',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  /**
   * Update a tenant (Super Admin only)
   */
  @Put(':id')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update tenant',
    description:
      'Updates tenant information. Only super admins can update tenants.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateTenantDto })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid data, slug conflict)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - New slug already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @GetUser('id') superAdminId: string,
  ) {
    return this.tenantService.update(id, updateTenantDto, superAdminId);
  }

  /**
   * Delete a tenant (Super Admin only)
   */
  @Delete(':id')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete tenant',
    description:
      'Soft deletes a tenant. Only super admins can delete tenants. ' +
      'Tenant cannot be deleted if it has existing bookings.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Tenant deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Tenant has existing bookings',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async remove(@Param('id') id: string, @GetUser('id') superAdminId: string) {
    return this.tenantService.remove(id, superAdminId);
  }

  /**
   * Get tenant members (Super Admin only)
   */
  @Get(':id/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get tenant members',
    description:
      'Returns a list of all members of a specific tenant with their roles. Only super admins can view tenant members.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tenant members',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              isActive: { type: 'boolean' },
              isSuperAdmin: { type: 'boolean' },
            },
          },
          roles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
          },
          joinedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super admin access required',
  })
  async getMembers(@Param('id') tenantId: string) {
    return this.tenantService.getMembers(tenantId);
  }
}
