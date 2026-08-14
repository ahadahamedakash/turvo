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
import { SlotsService } from './slots.service';
import { JwtAuthGuard } from '@src/common/guards/jwt-auth.guard';
import {
  TenantGuard,
  RequirePermissions,
  PermissionGuard,
} from '@src/common/guards/tenant.guard';
import { GetUser } from '@src/common/decorators/get-user.decorator';
import { CurrentTenant } from '@src/common/decorators/tenant-context.decorator';
import {
  ThrottleHourly,
  ThrottleMedium,
  ThrottlePermissive,
} from '@src/common/decorators/throttle.decorator';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { QuerySlotsDto } from './dto/query-slots.dto';
import { BlockSlotDto } from './dto/block-slot.dto';
import {
  SlotResponseDto,
  SlotListResponseDto,
  SlotGenerationResultDto,
} from './dto/slot-response.dto';
import {
  UpdateSlotSettingsDto,
  SlotSettingsResponseDto,
} from './dto/slot-settings.dto';
import { CreateHolidayDto, HolidayResponseDto } from './dto/holiday.dto';

@ApiTags('slots')
@Controller('slots')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@ApiBearerAuth()
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  /**
   * Generate slots from pricing rules for a date range (Tenant-scoped)
   */
  @Post('generate')
  @ThrottleHourly()
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate slots from pricing rules',
    description:
      'Generates slots over an inclusive date range by expanding the matching ' +
      'pricing rules. Day types (Weekday/Weekend/Holiday) are determined by the ' +
      "tenant's weekend days, holiday calendar, and timezone (default: Fri + Sat " +
      "weekend for Bangladesh). Slot length comes from each court's configured " +
      "interval. Omit courtId to generate for ALL of the tenant's courts. " +
      'Idempotent: dates that already have slots are skipped. ' +
      'Requires Court.update permission.',
  })
  @ApiBody({ type: GenerateSlotsDto })
  @ApiResponse({
    status: 201,
    description: 'Slots generated successfully',
    type: SlotGenerationResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid range or court not in tenant)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Court not found' })
  async generate(
    @Body() dto: GenerateSlotsDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.slotsService.generateSlots(tenantId, dto, userId);
  }

  /**
   * List slots for current tenant (Tenant-scoped)
   */
  @Get()
  @ThrottlePermissive()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List slots with filtering',
    description:
      'Returns a paginated list of slots for the current tenant. ' +
      'Can be filtered by court, status, and date. Expired holds are released before the query.',
  })
  @ApiQuery({
    name: 'courtId',
    required: false,
    type: String,
    description: 'Filter by court ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['Available', 'Booked', 'Blocked', 'Expired', 'Held'],
    description: 'Filter by slot status',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter by date (YYYY-MM-DD)',
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
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of slots',
    type: SlotListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Not a member of this organization',
  })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QuerySlotsDto,
  ) {
    return this.slotsService.findAll(tenantId, query);
  }

  // NOTE: settings & holidays routes MUST stay above @Get(':id') — otherwise
  // NestJS would match "settings"/"holidays" as the :id parameter.

  /**
   * Get slot-generation settings (Tenant-scoped)
   */
  @Get('settings')
  @ThrottlePermissive()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get slot-generation settings',
    description:
      'Returns the tenant settings that drive slot generation: configured ' +
      'weekend days (default Fri + Sat for Bangladesh), timezone, and the ' +
      'auto-generation configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Slot settings',
    type: SlotSettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Not a member of this organization',
  })
  async getSettings(@CurrentTenant() tenantId: string) {
    return this.slotsService.getSlotSettings(tenantId);
  }

  /**
   * Update slot-generation settings (Tenant-scoped)
   */
  @Put('settings')
  @ThrottleMedium()
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update slot-generation settings',
    description:
      'Updates weekend days and/or the auto-generation configuration. ' +
      'Weekend days are ISO weekday numbers (0 = Sunday … 6 = Saturday). ' +
      'Requires Court.update permission.',
  })
  @ApiBody({ type: UpdateSlotSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'Updated settings',
    type: SlotSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request (invalid values)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateSettings(
    @Body() dto: UpdateSlotSettingsDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.slotsService.updateSlotSettings(tenantId, dto, userId);
  }

  /**
   * List the tenant's holiday calendar (Tenant-scoped)
   */
  @Get('holidays')
  @ThrottlePermissive()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List holidays',
    description:
      'Returns the tenant holiday calendar. Dates marked as holidays are ' +
      'classified as Holiday during slot generation (and priced with Holiday ' +
      'pricing rules when they exist).',
  })
  @ApiResponse({
    status: 200,
    description: 'Holiday list',
    type: [HolidayResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listHolidays(@CurrentTenant() tenantId: string) {
    return this.slotsService.listHolidays(tenantId);
  }

  /**
   * Mark a date as a holiday (Tenant-scoped)
   */
  @Post('holidays')
  @ThrottleMedium()
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a holiday',
    description:
      'Marks a date as a holiday for the tenant. One holiday per date. ' +
      'Already-generated slots keep their price snapshot; future generation ' +
      'runs classify the date as Holiday. Requires Court.update permission.',
  })
  @ApiBody({ type: CreateHolidayDto })
  @ApiResponse({
    status: 201,
    description: 'Holiday created',
    type: HolidayResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request (invalid data)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - date already a holiday',
  })
  async addHoliday(
    @Body() dto: CreateHolidayDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.slotsService.addHoliday(tenantId, dto, userId);
  }

  /**
   * Remove a holiday (Tenant-scoped)
   */
  @Delete('holidays/:id')
  @ThrottleMedium()
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a holiday',
    description:
      'Removes a date from the tenant holiday calendar. Future generation ' +
      'runs classify the date by its weekday again. ' +
      'Requires Court.update permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Holiday ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Holiday removed',
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Holiday not found' })
  async removeHoliday(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.slotsService.removeHoliday(tenantId, id, userId);
  }

  /**
   * Get a single slot by ID (Tenant-scoped)
   */
  @Get(':id')
  @ThrottlePermissive()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get slot details',
    description:
      'Returns detailed information about a specific slot. ' +
      'Only accessible if the slot belongs to the current tenant.',
  })
  @ApiParam({
    name: 'id',
    description: 'Slot ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Slot details',
    type: SlotResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Access denied (slot belongs to another tenant)',
  })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  async findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.slotsService.findOne(id, tenantId);
  }

  /**
   * Hold a slot temporarily during checkout (Tenant-scoped)
   */
  @Post(':id/hold')
  @ThrottleMedium()
  @RequirePermissions('Booking.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hold a slot during checkout',
    description:
      'Places a temporary hold (default 15 minutes) on an available slot so it cannot be ' +
      'booked by anyone else during checkout. Requires Booking.create permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Slot ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Slot held successfully',
    type: SlotResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Slot is not available to hold',
  })
  async hold(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.slotsService.holdSlot(tenantId, id, userId);
  }

  /**
   * Release a held slot (Tenant-scoped)
   */
  @Post(':id/release')
  @ThrottleMedium()
  @RequirePermissions('Booking.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Release a slot hold',
    description:
      'Releases a previously held slot, returning it to Available. ' +
      'Requires Booking.create permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Slot ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Slot released successfully',
    type: SlotResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Slot is not currently held',
  })
  async release(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.slotsService.releaseSlotHold(tenantId, id, userId);
  }

  /**
   * Block a slot (maintenance, private events) (Tenant-scoped)
   */
  @Post(':id/block')
  @ThrottleMedium()
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Block a slot',
    description:
      'Blocks an available (or held) slot, e.g. for maintenance or a private event. ' +
      'Already-booked slots cannot be blocked. Requires Court.update permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Slot ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: BlockSlotDto })
  @ApiResponse({
    status: 200,
    description: 'Slot blocked successfully',
    type: SlotResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request (missing reason)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Slot is already booked or blocked',
  })
  async block(
    @Param('id') id: string,
    @Body() dto: BlockSlotDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.slotsService.blockSlot(tenantId, id, userId, dto.reason);
  }

  /**
   * Unblock a slot (Tenant-scoped)
   */
  @Post(':id/unblock')
  @ThrottleMedium()
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unblock a slot',
    description:
      'Returns a blocked slot to Available. Requires Court.update permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Slot ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Slot unblocked successfully',
    type: SlotResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Slot is not currently blocked',
  })
  async unblock(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.slotsService.unblockSlot(tenantId, id, userId);
  }

  /**
   * Cleanup expired/stale slots (Tenant-scoped)
   */
  @Delete('cleanup')
  @ThrottleMedium()
  @RequirePermissions('Court.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete stale slots before a date',
    description:
      'Hard-deletes slots strictly before the given date that are not booked and have no ' +
      'booking referencing them. Slots are regenerable from pricing rules, so this keeps the ' +
      'inventory table lean. Requires Court.update permission.',
  })
  @ApiQuery({
    name: 'beforeDate',
    required: true,
    type: String,
    description: 'Delete all slots before this date (YYYY-MM-DD)',
    example: '2025-08-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Stale slots deleted',
    schema: {
      type: 'object',
      properties: { deleted: { type: 'number', example: 168 } },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid date format)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async cleanup(
    @Query('beforeDate') beforeDate: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.slotsService.cleanupExpired(tenantId, beforeDate, userId);
  }
}
