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
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '@src/common/guard/jwt-auth.guard';
import {
  TenantGuard,
  RequirePermissions,
} from '@src/common/guard/tenant.guard';
import { GetUser } from '@src/common/decorators/get-user.decorator';
import { CurrentTenant } from '@src/common/decorators/tenant-context.decorator';
import {
  ThrottleHourly,
  ThrottleMedium,
} from '@src/common/decorators/throttle.decorator';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { QueryPricingRuleDto } from './dto/query-pricing-rule.dto';
import {
  PricingRuleResponseDto,
  PricingRuleListResponseDto,
} from './dto/pricing-rule-response.dto';

@ApiTags('pricing')
@Controller('pricing')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  /**
   * Create a new pricing rule (Tenant-scoped)
   */
  @Post()
  @ThrottleHourly() // Rate limiting: 20 requests per hour
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new pricing rule',
    description:
      'Creates a new pricing rule for a specific court and day type. ' +
      'Pricing rules define hourly rates based on day type and time ranges. ' +
      'Time ranges cannot overlap for the same court and day type. ' +
      'Requires Court.update permission.',
  })
  @ApiBody({ type: CreatePricingRuleDto })
  @ApiResponse({
    status: 201,
    description: 'Pricing rule created successfully',
    schema: {
      type: 'object',
      properties: {
        pricingRule: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            courtId: { type: 'string' },
            dayType: { type: 'string' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            price: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request (invalid data, time range invalid, court not in tenant)',
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
  @ApiResponse({
    status: 409,
    description: 'Conflict - Overlapping pricing rule exists',
  })
  async create(
    @Body() createPricingRuleDto: CreatePricingRuleDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.pricingService.create(createPricingRuleDto, tenantId, userId);
  }

  /**
   * Get all pricing rules for current tenant (Tenant-scoped)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all pricing rules',
    description:
      'Returns a paginated list of pricing rules for the current tenant. ' +
      'Can be filtered by court and day type. Results are sorted by court name, day type, and start time.',
  })
  @ApiQuery({
    name: 'courtId',
    required: false,
    type: String,
    description: 'Filter by court ID',
  })
  @ApiQuery({
    name: 'dayType',
    required: false,
    enum: ['Weekday', 'Weekend', 'Holiday'],
    description: 'Filter by day type',
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
    description: 'List of pricing rules',
    type: PricingRuleListResponseDto,
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
    @Query() query: QueryPricingRuleDto,
  ) {
    return this.pricingService.findAll(tenantId, query);
  }

  /**
   * Get a single pricing rule by ID (Tenant-scoped)
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get pricing rule by ID',
    description:
      'Returns detailed information about a specific pricing rule. ' +
      'Only accessible if the pricing rule belongs to the current tenant.',
  })
  @ApiParam({
    name: 'id',
    description: 'Pricing rule ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Pricing rule details',
    type: PricingRuleResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied (pricing rule belongs to another tenant)',
  })
  @ApiResponse({
    status: 404,
    description: 'Pricing rule not found',
  })
  async findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.pricingService.findOne(id, tenantId);
  }

  /**
   * Update a pricing rule (Tenant-scoped)
   */
  @Put(':id')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update pricing rule',
    description:
      'Updates pricing rule information. Only accessible if the pricing rule belongs to the current tenant. ' +
      'Time ranges cannot overlap with existing rules. Requires Court.update permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Pricing rule ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdatePricingRuleDto })
  @ApiResponse({
    status: 200,
    description: 'Pricing rule updated successfully',
    type: PricingRuleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid data, time range conflict)',
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
    description: 'Pricing rule not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Overlapping pricing rule exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updatePricingRuleDto: UpdatePricingRuleDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.pricingService.update(
      id,
      updatePricingRuleDto,
      tenantId,
      userId,
    );
  }

  /**
   * Delete a pricing rule (Tenant-scoped)
   */
  @Delete(':id')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete pricing rule',
    description:
      'Soft deletes a pricing rule. Only accessible if the pricing rule belongs to the current tenant. ' +
      'Existing slots will keep their price snapshot. Requires Court.update permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Pricing rule ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Pricing rule deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Pricing rule deleted successfully',
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
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Pricing rule not found',
  })
  async remove(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.pricingService.remove(id, tenantId, userId);
  }

  /**
   * Bulk create pricing rules for a court (Tenant-scoped)
   */
  @Post('bulk')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk create pricing rules',
    description:
      'Creates multiple pricing rules for a court in a single request. ' +
      'Useful for setting up default pricing schedules. Failed rules are skipped. ' +
      'Requires Court.update permission.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        courtId: {
          type: 'string',
          description: 'Court ID to create pricing rules for',
        },
        rules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dayType: { type: 'string' },
              startTime: { type: 'string' },
              endTime: { type: 'string' },
              price: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Pricing rules created',
    schema: {
      type: 'object',
      properties: {
        pricingRules: { type: 'array', items: { type: 'object' } },
        failed: {
          type: 'number',
          description: 'Number of rules that failed to create',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
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
  async bulkCreate(
    @Body()
    body: {
      courtId: string;
      rules: Omit<CreatePricingRuleDto, 'courtId'>[];
    },
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.pricingService.bulkCreate(
      body.courtId,
      body.rules,
      tenantId,
      userId,
    );
  }
}
