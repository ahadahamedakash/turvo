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
import { CourtsService } from './courts.service';
import { JwtAuthGuard } from '@src/common/guard/jwt-auth.guard';
import { TenantGuard, RequirePermissions } from '@src/common/guard/tenant.guard';
import { GetUser } from '@src/common/decorators/get-user.decorator';
import { CurrentTenant, CurrentMember } from '@src/common/decorators/tenant-context.decorator';
import { ThrottleHourly, ThrottleMedium } from '@src/common/decorators/throttle.decorator';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { QueryCourtDto } from './dto/query-court.dto';
import {
  CourtResponseDto,
  CourtListResponseDto,
} from './dto/court-response.dto';

@ApiTags('courts')
@Controller('courts')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  /**
   * Create a new court (Tenant-scoped)
   */
  @Post()
  @ThrottleHourly() // Rate limiting: 20 requests per hour
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('Court.create')
  @ApiOperation({
    summary: 'Create a new court',
    description:
      'Creates a new court for the current tenant. Court name must be unique within the tenant. ' +
      'Requires Court.create permission.',
  })
  @ApiBody({ type: CreateCourtDto })
  @ApiResponse({
    status: 201,
    description: 'Court created successfully',
    schema: {
      type: 'object',
      properties: {
        court: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            tenantId: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid data, name already exists)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Court with this name already exists',
  })
  async create(
    @Body() createCourtDto: CreateCourtDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.courtsService.create(createCourtDto, tenantId, userId);
  }

  /**
   * Get all courts for current tenant (Tenant-scoped)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all courts',
    description:
      'Returns a paginated list of courts for the current tenant. ' +
      'Supports filtering by status, searching by name/description, and including deleted courts.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['Available', 'Maintenance', 'Inactive'],
    description: 'Filter by court status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or description',
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Include soft deleted courts',
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
    description: 'List of courts',
    type: CourtListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Not a member of this organization',
  })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryCourtDto,
  ) {
    return this.courtsService.findAll(tenantId, query);
  }

  /**
   * Get a single court by ID (Tenant-scoped)
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get court by ID',
    description:
      'Returns detailed information about a specific court including counts of pricing rules, slots, and bookings. ' +
      'Only accessible if the court belongs to the current tenant.',
  })
  @ApiParam({
    name: 'id',
    description: 'Court ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Court details',
    type: CourtResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied (court belongs to another tenant)',
  })
  @ApiResponse({
    status: 404,
    description: 'Court not found',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.courtsService.findOne(id, tenantId);
  }

  /**
   * Update a court (Tenant-scoped)
   */
  @Put(':id')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update court',
    description:
      'Updates court information. Only accessible if the court belongs to the current tenant. ' +
      'Requires Court.update permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Court ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateCourtDto })
  @ApiResponse({
    status: 200,
    description: 'Court updated successfully',
    type: CourtResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid data, name conflict)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or wrong tenant',
  })
  @ApiResponse({
    status: 404,
    description: 'Court not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - New name already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCourtDto: UpdateCourtDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.courtsService.update(id, updateCourtDto, tenantId, userId);
  }

  /**
   * Delete a court (Tenant-scoped)
   */
  @Delete(':id')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @RequirePermissions('Court.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete court',
    description:
      'Soft deletes a court. Only accessible if the court belongs to the current tenant. ' +
      'Court cannot be deleted if it has existing bookings. Requires Court.delete permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Court ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Court deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Court deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Court has existing bookings',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Court not found',
  })
  async remove(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.courtsService.remove(id, tenantId, userId);
  }

  /**
   * Restore a soft deleted court (Tenant-scoped)
   */
  @Post(':id/restore')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @RequirePermissions('Court.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore deleted court',
    description:
      'Restores a soft deleted court. Only accessible if the court belongs to the current tenant. ' +
      'Requires Court.create permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Court ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Court restored successfully',
    type: CourtResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Deleted court not found',
  })
  async restore(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.courtsService.restore(id, tenantId, userId);
  }
}
