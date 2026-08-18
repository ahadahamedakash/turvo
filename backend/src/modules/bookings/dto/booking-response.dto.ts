import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SlotStatus,
  BookingEventType,
} from '../../../../generated/prisma/client';

/**
 * Money is serialized as string (Prisma Decimal → toString), dates as
 * YYYY-MM-DD, times as HH:mm — symmetric with the slots/pricing wire format.
 */

export class BookingListItemDto {
  @ApiProperty({ description: 'Booking ID' })
  id!: string;

  @ApiProperty({ description: 'Booking date (first slot)', example: '2026-08-18' })
  date!: string;

  @ApiProperty({ description: 'Start time of first slot', example: '18:00' })
  startTime!: string;

  @ApiProperty({ description: 'End time of last slot', example: '20:00' })
  endTime!: string;

  @ApiProperty({ description: 'Court ID' })
  courtId!: string;

  @ApiProperty({ description: 'Court name', example: 'Turf A' })
  courtName!: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId!: string;

  @ApiProperty({ description: 'Customer full name', example: 'Karim Rahman' })
  customerName!: string;

  @ApiPropertyOptional({ description: 'Customer phone', example: '+8801711234567', nullable: true })
  customerPhone?: string | null;

  @ApiProperty({ description: 'Number of slots in the booking', example: 2 })
  slotCount!: number;

  @ApiProperty({ description: 'Human duration', example: '2h' })
  durationLabel!: string;

  @ApiProperty({ description: 'Booking status', enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty({ description: 'Sum of slot prices', example: '1000.00' })
  subTotal!: string;

  @ApiProperty({ description: 'Discount applied', example: '100.00' })
  discount!: string;

  @ApiProperty({ description: 'Total payable', example: '900.00' })
  total!: string;

  @ApiProperty({ description: 'Net paid (inflows − refunds)', example: '500.00' })
  paidAmount!: string;

  @ApiProperty({ description: 'total − paidAmount', example: '400.00' })
  due!: string;

  @ApiProperty({
    description: 'Derived: Paid | Partial | Unpaid',
    enum: ['Paid', 'Partial', 'Unpaid'],
  })
  paymentStatus!: 'Paid' | 'Partial' | 'Unpaid';

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;
}

export class BookingCustomerDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Karim' }) firstName!: string;
  @ApiProperty({ example: 'Rahman' }) lastName!: string;
  @ApiPropertyOptional({ nullable: true }) phone?: string | null;
  @ApiPropertyOptional({ nullable: true }) email?: string | null;
}

export class BookingSlotDto {
  @ApiProperty({ description: 'Slot ID' })
  id!: string;

  @ApiProperty({ description: 'Slot start', example: '18:00' })
  startTime!: string;

  @ApiProperty({ description: 'Slot end', example: '19:00' })
  endTime!: string;

  @ApiProperty({ description: 'Price snapshotted at booking time', example: '500.00' })
  price!: string;

  @ApiProperty({ description: 'Current slot status', enum: SlotStatus })
  status!: SlotStatus;
}

export class PaymentRecordDto {
  @ApiProperty() id!: string;

  @ApiProperty({ description: 'Amount', example: '500.00' })
  amount!: string;

  @ApiProperty({ enum: PaymentMethod })
  method!: PaymentMethod;

  @ApiProperty({ enum: PaymentType })
  type!: PaymentType;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiPropertyOptional({ nullable: true }) referenceNumber?: string | null;

  @ApiProperty() createdAt!: Date;

  @ApiProperty({ description: 'Staff member who recorded it', example: 'Ahad Ahamed' })
  issuedByName!: string;
}

export class BookingEventDto {
  @ApiProperty() id!: string;

  @ApiProperty({ description: 'Event type', enum: BookingEventType })
  eventType!: BookingEventType;

  @ApiProperty() createdAt!: Date;

  @ApiProperty({ description: 'Who triggered the event', example: 'Ahad Ahamed' })
  issuedByName!: string;

  @ApiProperty({
    description: 'One-line human summary for the timeline',
    example: 'Status: Pending → Confirmed',
  })
  summary!: string;
}

export class BookingDetailDto extends BookingListItemDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 1000 }) notes?: string | null;

  @ApiProperty({ type: BookingCustomerDto })
  customer!: BookingCustomerDto;

  @ApiProperty({ type: [BookingSlotDto], description: 'Ordered by start time' })
  slots!: BookingSlotDto[];

  @ApiProperty({ type: [PaymentRecordDto], description: 'Ordered oldest first' })
  payments!: PaymentRecordDto[];

  @ApiProperty({ type: [BookingEventDto], description: 'Newest first' })
  events!: BookingEventDto[];

  @ApiProperty({ example: 'Ahad Ahamed' }) createdByName!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Ahad Ahamed' }) cancelledByName?: string | null;

  @ApiPropertyOptional({ nullable: true }) cancelledAt?: Date | null;
}

export class BookingListResponseDto {
  @ApiProperty({ type: [BookingListItemDto] }) data!: BookingListItemDto[];
  @ApiProperty({ example: 42 }) total!: number;
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) limit!: number;
  @ApiProperty({ example: 3 }) totalPages!: number;
}

// ---------------------------------------------------------------------------
// Day view (calendar grid payload)
// ---------------------------------------------------------------------------

export class DayViewCourtDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Turf A' }) name!: string;
  @ApiProperty({ description: 'Slot length in minutes', example: 60 })
  slotIntervalMinutes!: number;
}

export class DayViewBookingDto {
  @ApiProperty({ description: 'Booking ID' }) id!: string;
  @ApiProperty({ example: 'Karim Rahman' }) customerName!: string;
  @ApiPropertyOptional({ nullable: true }) customerPhone?: string | null;
  @ApiProperty({ enum: BookingStatus }) status!: BookingStatus;
  @ApiProperty({ enum: ['Paid', 'Partial', 'Unpaid'] })
  paymentStatus!: 'Paid' | 'Partial' | 'Unpaid';
  @ApiProperty({ example: '900.00' }) total!: string;
  @ApiProperty({ example: '500.00' }) paidAmount!: string;
  @ApiProperty({ example: '400.00' }) due!: string;
  @ApiProperty({ description: 'Slots this booking spans', example: 2 })
  slotCount!: number;
  @ApiProperty({
    description:
      'true only on the booking\'s first (label) slot — continuation slots ' +
      'repeat the booking with isStart false so the grid can occupy cells.',
    example: true,
  })
  isStart!: boolean;
}

export class DayViewSlotDto {
  @ApiProperty() id!: string;
  @ApiProperty() courtId!: string;
  @ApiProperty({ example: '18:00' }) startTime!: string;
  @ApiProperty({ example: '19:00' }) endTime!: string;
  @ApiProperty({ example: '500.00' }) price!: string;
  @ApiProperty({ enum: SlotStatus }) status!: SlotStatus;
  @ApiPropertyOptional({ nullable: true, description: 'Present while Held' })
  heldUntil?: Date | null;
  @ApiPropertyOptional({
    type: DayViewBookingDto,
    description: 'Attached active booking (absent on available/blocked cells)',
  })
  booking?: DayViewBookingDto;
}

export class DayViewStatsDto {
  @ApiProperty({ description: 'Distinct active bookings on the date', example: 12 })
  bookingsCount!: number;
  @ApiProperty({ example: 48 }) totalSlots!: number;
  @ApiProperty({ example: 31 }) bookedSlots!: number;
  @ApiProperty({ description: 'bookedSlots / totalSlots × 100', example: 64.6 })
  utilizationPct!: number;
  @ApiProperty({ description: 'Σ paidAmount of active bookings', example: '9500.00' })
  collected!: string;
}

export class DayViewResponseDto {
  @ApiProperty({ example: '2026-08-18' }) date!: string;
  @ApiProperty({ type: [DayViewCourtDto] }) courts!: DayViewCourtDto[];
  @ApiProperty({ type: [DayViewSlotDto] }) slots!: DayViewSlotDto[];
  @ApiProperty({ type: DayViewStatsDto }) stats!: DayViewStatsDto;
}
