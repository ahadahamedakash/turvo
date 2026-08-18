import {
  Controller,
  Get,
  Post,
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
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '@src/common/guards/jwt-auth.guard';
import {
  TenantGuard,
  RequirePermissions,
  PermissionGuard,
} from '@src/common/guards/tenant.guard';
import { GetUser } from '@src/common/decorators/get-user.decorator';
import {
  CurrentTenant,
  CurrentMember,
} from '@src/common/decorators/tenant-context.decorator';
import {
  ThrottleMedium,
  ThrottlePermissive,
} from '@src/common/decorators/throttle.decorator';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { DayViewQueryDto } from './dto/day-view.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreatePaymentDto } from './dto/record-payment.dto';
import {
  BookingDetailDto,
  BookingListResponseDto,
  DayViewResponseDto,
  PaymentRecordDto,
} from './dto/booking-response.dto';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Create a booking (Tenant-scoped)
   */
  @Post()
  @ThrottleMedium()
  @RequirePermissions('Booking.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a multi-slot booking',
    description:
      'Books 1-8 consecutive slots on one court and date (staff flow: ' +
      'Available → Booked in ONE atomic conditional update; a concurrent ' +
      'taker wins the race and the loser gets 409). Resolves or creates the ' +
      'customer inline. Optional cash collection at creation. Every write ' +
      '(slots, booking, booking_slots, payment, events, audit) happens in a ' +
      'single transaction.',
  })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({ status: 201, description: 'Booking created', type: BookingDetailDto })
  @ApiResponse({ status: 400, description: 'Slots not consecutive / same court / same date, discount > sub-total, or payment > total' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Slot or selected customer not found' })
  @ApiResponse({ status: 409, description: 'One or more slots were just taken' })
  async create(
    @Body() dto: CreateBookingDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
    @CurrentMember() memberId: string,
  ): Promise<BookingDetailDto> {
    return this.bookingsService.create(tenantId, dto, { userId, memberId });
  }

  /**
   * List bookings (Tenant-scoped)
   */
  @Get()
  @ThrottlePermissive()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('Booking.view')
  @ApiOperation({
    summary: 'List bookings with filtering and pagination',
    description:
      'Filters: date range (on the denormalized booking date), court, ' +
      'status, derived payment status (Paid/Partial/Unpaid via column ' +
      'comparisons), and customer free-text (name/phone contains).',
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'YYYY-MM-DD (inclusive)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'YYYY-MM-DD (inclusive)' })
  @ApiQuery({ name: 'courtId', required: false, type: String, description: 'Court UUID' })
  @ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'NoShow'] })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: ['Paid', 'Partial', 'Unpaid'] })
  @ApiQuery({ name: 'customer', required: false, type: String, description: 'Customer name or phone (contains)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated bookings', type: BookingListResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request (invalid filters)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() query: QueryBookingsDto,
    @CurrentTenant() tenantId: string,
  ): Promise<BookingListResponseDto> {
    return this.bookingsService.findAll(tenantId, query);
  }

  // NOTE: the day-view route MUST stay above @Get(':id') — otherwise NestJS
  // would match "day-view" as the :id parameter.
  /**
   * Calendar day grid (Tenant-scoped)
   */
  @Get('day-view')
  @ThrottlePermissive()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('Booking.view')
  @ApiOperation({
    summary: 'Purpose-built calendar payload for one date',
    description:
      'Returns ALL slots of ALL tenant courts for the date with active ' +
      'bookings inlined (customer + payment summary, isStart block markers) ' +
      'plus day stats. Why not /slots + /bookings joined on the client: ' +
      '/slots is paginated while the grid needs every row; booked cells need ' +
      'customer + payment data (client join = N+1 fetches); only the server ' +
      'can mark booking block starts; one request = one polling loop = one ' +
      'cache invalidation key.',
  })
  @ApiQuery({ name: 'date', required: true, type: String, example: '2026-08-18' })
  @ApiResponse({ status: 200, description: 'Day grid payload', type: DayViewResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request (invalid date)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getDayView(
    @Query() query: DayViewQueryDto,
    @CurrentTenant() tenantId: string,
  ): Promise<DayViewResponseDto> {
    return this.bookingsService.getDayView(tenantId, query.date);
  }

  /**
   * Get a single booking with timeline (Tenant-scoped)
   */
  @Get(':id')
  @ThrottlePermissive()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('Booking.view')
  @ApiOperation({
    summary: 'Booking detail',
    description:
      'Full booking: customer, ordered slots with snapshotted prices, ' +
      'payments (oldest first), BookingEvent timeline (newest first).',
  })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking detail', type: BookingDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ): Promise<BookingDetailDto> {
    return this.bookingsService.findOne(tenantId, id);
  }

  /**
   * Confirm a tentative booking (Tenant-scoped)
   */
  @Post(':id/confirm')
  @ThrottleMedium()
  @RequirePermissions('Booking.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a Pending booking (Pending → Confirmed)' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking confirmed', type: BookingDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Booking is not Pending' })
  async confirm(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
    @CurrentMember() memberId: string,
  ): Promise<BookingDetailDto> {
    return this.bookingsService.transitionStatus(tenantId, id, 'confirm', {
      userId,
      memberId,
    });
  }

  /**
   * Cancel a booking (Tenant-scoped)
   */
  @Post(':id/cancel')
  @ThrottleMedium()
  @RequirePermissions('Booking.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a booking (reason required, slots released)',
    description:
      'Pending/Confirmed → Cancelled. Releases the booking\'s slots back ' +
      'to Available (a slot Blocked mid-flight stays Blocked — block wins). ' +
      'Optional refund when paidAmount > 0. The reason is stored on the ' +
      'Cancelled BookingEvent (the timeline is the display surface), not as ' +
      'a booking column.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiBody({ type: CancelBookingDto })
  @ApiResponse({ status: 200, description: 'Booking cancelled', type: BookingDetailDto })
  @ApiResponse({ status: 400, description: 'Invalid refund (nothing paid / exceeds paidAmount)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Already cancelled/completed, or modified concurrently' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
    @CurrentMember() memberId: string,
  ): Promise<BookingDetailDto> {
    return this.bookingsService.cancel(tenantId, id, dto, { userId, memberId });
  }

  /**
   * Mark a booking completed (Tenant-scoped)
   */
  @Post(':id/complete')
  @ThrottleMedium()
  @RequirePermissions('Booking.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a Confirmed booking (Confirmed → Completed)' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking completed', type: BookingDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Booking is not Confirmed' })
  async complete(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
    @CurrentMember() memberId: string,
  ): Promise<BookingDetailDto> {
    return this.bookingsService.transitionStatus(tenantId, id, 'complete', {
      userId,
      memberId,
    });
  }

  /**
   * Mark a booking no-show (Tenant-scoped)
   */
  @Post(':id/no-show')
  @ThrottleMedium()
  @RequirePermissions('Booking.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a booking no-show (Pending|Confirmed → NoShow)',
    description:
      'Slots stay Booked — the time was consumed and must not re-open.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking marked no-show', type: BookingDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Booking is not Pending or Confirmed' })
  async noShow(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
    @CurrentMember() memberId: string,
  ): Promise<BookingDetailDto> {
    return this.bookingsService.transitionStatus(tenantId, id, 'no-show', {
      userId,
      memberId,
    });
  }

  /**
   * Record a cash payment (Tenant-scoped)
   */
  @Post(':id/payments')
  @ThrottleMedium()
  @RequirePermissions('Payment.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record a cash payment on a booking',
    description:
      'Amount cannot exceed the remaining due. Optimistically gated on the ' +
      'booking paidAmount — if another staff member records a payment ' +
      'concurrently, the slower request gets 409 and must refresh.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: 'Payment recorded', type: PaymentRecordDto })
  @ApiResponse({ status: 400, description: 'Amount exceeds remaining due' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Booking balance changed concurrently, or booking state does not allow payments' })
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') userId: string,
    @CurrentMember() memberId: string,
  ): Promise<PaymentRecordDto> {
    return this.bookingsService.recordPayment(tenantId, id, dto, {
      userId,
      memberId,
    });
  }
}
