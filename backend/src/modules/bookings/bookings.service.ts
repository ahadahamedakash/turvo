import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';
import {
  Prisma,
  PrismaClient,
  BookingStatus,
  BookingEventType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SlotStatus,
} from '../../../generated/prisma/client';
import { SlotsService } from '../slots/slots.service';
import { CustomersService } from '../customers/customers.service';
import { CreateBookingDto, PaymentMode } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { CreatePaymentDto } from './dto/record-payment.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import {
  BookingDetailDto,
  BookingListItemDto,
  BookingListResponseDto,
  BookingSlotDto,
  BookingCustomerDto,
  PaymentRecordDto,
  BookingEventDto,
  DayViewResponseDto,
  DayViewSlotDto,
} from './dto/booking-response.dto';

/**
 * Prisma transaction client type. Local copy per the documented decision
 * (same as SlotsService/CustomersService) — extracting to common/ is a
 * separate cleanup task.
 */
type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/** Who is performing the action (extracted in the controller). */
interface BookingActor {
  userId: string;
  memberId: string;
}

type Transition = 'confirm' | 'complete' | 'no-show';

const TRANSITIONS: Record<
  Transition,
  { from: BookingStatus[]; to: BookingStatus }
> = {
  confirm: { from: [BookingStatus.Pending], to: BookingStatus.Confirmed },
  complete: { from: [BookingStatus.Confirmed], to: BookingStatus.Completed },
  'no-show': {
    from: [BookingStatus.Pending, BookingStatus.Confirmed],
    to: BookingStatus.NoShow,
  },
};

const LIST_INCLUDE = {
  court: { select: { name: true } },
  customer: true,
  _count: { select: { bookingSlots: true } },
} as const satisfies Prisma.BookingInclude;

type BookingWithList = Prisma.BookingGetPayload<{
  include: typeof LIST_INCLUDE;
}>;

const DETAIL_INCLUDE = {
  court: { select: { name: true } },
  customer: true,
  bookingSlots: {
    include: { slot: true },
    orderBy: { slot: { startTime: 'asc' } },
  },
  payments: {
    include: {
      issuedByMember: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
  bookingEvents: {
    include: { issuedByUser: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  },
  createdByUser: { select: { firstName: true, lastName: true } },
  cancelledByUser: { select: { firstName: true, lastName: true } },
} as const satisfies Prisma.BookingInclude;

type BookingWithDetail = Prisma.BookingGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;

// Active booking statuses attachable to a calendar cell. Cancelled bookings
// keep their booking_slots rows (history) but must NOT paint grid cells —
// the day-view relation filter uses this list.
const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.Pending,
  BookingStatus.Confirmed,
  BookingStatus.Completed,
  BookingStatus.NoShow,
];

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotsService: SlotsService,
    private readonly customersService: CustomersService,
  ) {}

  // ==========================================================================
  // Create (multi-slot booking, optional cash at creation)
  // ==========================================================================

  /**
   * Create a booking spanning consecutive slots. Staff flow only — slots go
   * Available → Booked directly (the 15-min Held phase is reserved for the
   * future public wizard). ONE transaction, race-gated by a single
   * conditional updateMany (smallest critical section — beats per-slot
   * bookSlot() calls).
   *
   * DEVIATION (documented in prisma/booking.prisma): the denormalized
   * date/startTime/endTime/paidAmount are set here and maintained on every
   * subsequent payment write in this service. A future standalone payments
   * module MUST also maintain paidAmount.
   */
  async create(
    tenantId: string,
    dto: CreateBookingDto,
    actor: BookingActor,
  ): Promise<BookingDetailDto> {
    const slotIds = [...new Set(dto.slotIds)];

    // Query tenant bookingAmount for payment mode calculation
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { bookingAmount: true },
    });

    const booking = await this.prisma.$transaction(async (tx) => {
      // --- Validate slot shape (read-only, no check-then-act on state) ---
      const slots = await tx.slot.findMany({
        where: { id: { in: slotIds }, tenantId, deletedAt: null },
        orderBy: { startTime: 'asc' },
      });
      if (slots.length !== slotIds.length) {
        throw new NotFoundException('Slot not found');
      }
      if (new Set(slots.map((s) => s.courtId)).size > 1) {
        throw new BadRequestException('Slots must be on the same court');
      }
      if (new Set(slots.map((s) => s.date.getTime())).size > 1) {
        throw new BadRequestException('Slots must be on the same date');
      }
      for (let i = 1; i < slots.length; i++) {
        if (slots[i - 1].endTime.getTime() !== slots[i].startTime.getTime()) {
          throw new BadRequestException('Slots must be consecutive');
        }
      }

      // --- RACE GATE: one atomic statement books ALL slots ---
      const booked = await tx.slot.updateMany({
        where: {
          id: { in: slotIds },
          tenantId,
          deletedAt: null,
          status: { in: [SlotStatus.Available, SlotStatus.Held] },
        },
        data: {
          status: SlotStatus.Booked,
          heldAt: null,
          heldBy: null,
          heldUntil: null,
        },
      });
      if (booked.count !== slotIds.length) {
        throw new ConflictException(
          'One or more slots were just taken — refresh and try again',
        );
      }

      const customer = await this.customersService.findOrCreate(
        tenantId,
        dto.customer,
        tx,
      );

      const subTotal = slots.reduce(
        (sum, s) => sum.add(s.price),
        new Prisma.Decimal(0),
      );
      const discount = new Prisma.Decimal(dto.discount ?? 0);
      if (discount.gt(subTotal)) {
        throw new BadRequestException('Discount cannot exceed sub-total');
      }
      const total = subTotal.sub(discount);

      const status = dto.status ?? BookingStatus.Confirmed;

      let paymentData: {
        amount: Prisma.Decimal;
        method: PaymentMethod;
        type: PaymentType;
        referenceNumber?: string;
      } | null = null;

      // NEW: Payment calculation based on mode
      const paymentMode = dto.paymentMode ?? PaymentMode.NONE;
      if (paymentMode !== PaymentMode.NONE) {
        let amount: Prisma.Decimal;

        switch (paymentMode) {
          case PaymentMode.BOOKING:
            // Collect configured booking amount (capped at total)
            const bookingAmount =
              tenant?.bookingAmount ?? new Prisma.Decimal(0);
            amount = bookingAmount.gt(total) ? total : bookingAmount;
            break;

          case PaymentMode.FULL:
            // Collect full amount
            amount = total;
            break;

          case PaymentMode.CUSTOM:
            // Manual amount from dto.payment
            if (!dto.payment?.amount) {
              throw new BadRequestException(
                'Payment amount required for custom mode',
              );
            }
            amount = new Prisma.Decimal(dto.payment.amount);
            if (amount.gt(total)) {
              throw new BadRequestException(
                'Payment amount exceeds booking total',
              );
            }
            break;

          default:
            throw new BadRequestException('Invalid payment mode');
        }

        // Validate amount for booking mode (skip if zero)
        if (paymentMode === PaymentMode.BOOKING && amount.lte(0)) {
          // Booking amount not configured or zero - treat as no payment
          paymentData = null;
        } else {
          this.assertMemberContext(actor.memberId);
          paymentData = {
            amount,
            method: dto.payment?.method ?? PaymentMethod.Cash,
            type: amount.lt(total) ? PaymentType.Advance : PaymentType.Due,
            referenceNumber: dto.payment?.referenceNumber,
          };
        }
      } else if (dto.payment) {
        // Legacy path: explicit payment object without paymentMode
        this.assertMemberContext(actor.memberId);
        const amount = new Prisma.Decimal(dto.payment.amount);
        if (amount.gt(total)) {
          throw new BadRequestException('Payment amount exceeds booking total');
        }
        paymentData = {
          amount,
          method: dto.payment.method ?? PaymentMethod.Cash,
          type: amount.lt(total) ? PaymentType.Advance : PaymentType.Due,
          referenceNumber: dto.payment.referenceNumber,
        };
      }

      const booking = await tx.booking.create({
        data: {
          tenantId,
          courtId: slots[0].courtId,
          customerId: customer.id,
          status,
          subTotal,
          discount,
          total,
          paidAmount: paymentData?.amount ?? new Prisma.Decimal(0),
          notes: dto.notes,
          createdBy: actor.userId,
          // Denormalized fields (see DEVIATION note above)
          date: slots[0].date,
          startTime: slots[0].startTime,
          endTime: slots[slots.length - 1].endTime,
        },
      });

      await tx.bookingSlot.createMany({
        data: slots.map((s) => ({
          tenantId,
          bookingId: booking.id,
          slotId: s.id,
          price: s.price,
        })),
      });

      if (paymentData) {
        await tx.payment.create({
          data: {
            tenantId,
            bookingId: booking.id,
            amount: paymentData.amount,
            method: paymentData.method,
            status: PaymentStatus.Paid,
            type: paymentData.type,
            issuedBy: actor.memberId,
            paidBy: actor.userId,
            paidAt: new Date(),
            referenceNumber: paymentData.referenceNumber,
          },
        });
      }

      // --- Events + audit, same transaction ---
      const eventValue = {
        slotIds,
        date: this.formatDateToYYYYMMDD(booking.date),
        startTime: this.formatTimeToHHmm(booking.startTime),
        endTime: this.formatTimeToHHmm(booking.endTime),
        total: total.toString(),
      };
      await tx.bookingEvent.create({
        data: {
          tenantId,
          bookingId: booking.id,
          eventType: BookingEventType.Created,
          newValue: eventValue,
          issuedBy: actor.userId,
        },
      });
      if (status === BookingStatus.Confirmed) {
        await tx.bookingEvent.create({
          data: {
            tenantId,
            bookingId: booking.id,
            eventType: BookingEventType.StatusChanged,
            oldValue: { status: null },
            newValue: { status: BookingStatus.Confirmed },
            issuedBy: actor.userId,
          },
        });
      }
      if (paymentData) {
        await tx.bookingEvent.create({
          data: {
            tenantId,
            bookingId: booking.id,
            eventType: BookingEventType.PaymentReceived,
            newValue: {
              amount: paymentData.amount.toString(),
              method: paymentData.method,
              type: paymentData.type,
            },
            issuedBy: actor.userId,
          },
        });
      }
      await this.createAuditLog(tx, {
        tenantId,
        userId: actor.userId,
        entityType: 'Booking',
        entityId: booking.id,
        action: 'Create',
        newValue: {
          ...eventValue,
          status,
          customerId: customer.id,
          ...(paymentData
            ? {
                payment: {
                  amount: paymentData.amount.toString(),
                  method: paymentData.method,
                },
              }
            : {}),
        },
      });

      return booking;
    });

    return this.findOne(tenantId, booking.id);
  }

  // ==========================================================================
  // Reads
  // ==========================================================================

  /**
   * Paginated, filterable booking list. Date-range and payment-status
   * filters hit the denormalized columns directly (that's why they exist).
   */
  async findAll(
    tenantId: string,
    query: QueryBookingsDto,
  ): Promise<BookingListResponseDto> {
    const where: Prisma.BookingWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.courtId) where.courtId = query.courtId;
    if (query.status) where.status = query.status;

    const dateFilter: Prisma.DateTimeFilter<'Booking'> = {};
    if (query.dateFrom) {
      dateFilter.gte = this.parseDateString(query.dateFrom);
    }
    if (query.dateTo) {
      dateFilter.lte = this.parseDateString(query.dateTo);
    }
    if (dateFilter.gte || dateFilter.lte) where.date = dateFilter;

    if (query.paymentStatus) {
      // Column-vs-column comparisons via Prisma field references — a plain
      // where cannot compare paidAmount to total.
      const totalField = this.prisma.booking.fields.total;
      if (query.paymentStatus === 'Paid') {
        where.paidAmount = { gte: totalField };
      } else if (query.paymentStatus === 'Partial') {
        where.paidAmount = { gt: 0, lt: totalField };
      } else {
        where.paidAmount = 0;
      }
    }

    if (query.customer) {
      where.customer = {
        OR: [
          { firstName: { contains: query.customer, mode: 'insensitive' } },
          { lastName: { contains: query.customer, mode: 'insensitive' } },
          { phone: { contains: query.customer, mode: 'insensitive' } },
        ],
      };
    }

    const { page = 1, limit = 20 } = query;
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings.map((b) => this.transformListItem(b)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /** Single booking with timeline, payments, slots (404 when out of tenant). */
  async findOne(tenantId: string, id: string): Promise<BookingDetailDto> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: DETAIL_INCLUDE,
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return this.transformDetail(booking);
  }

  /**
   * Purpose-built calendar payload — ONE request, no client-side join.
   * (Why not /slots + /bookings on the client: /slots is paginated and the
   * grid needs ALL slots of ALL courts; booked cells need customer + payment
   * summary (client join = N+1 fetches); the server marks block starts
   * (isStart); one request = one polling loop = one invalidation key.)
   */
  async getDayView(
    tenantId: string,
    dateStr: string,
  ): Promise<DayViewResponseDto> {
    // Lazy hold expiry so availability is as-of now (mirrors slots reads)
    await this.slotsService.releaseExpiredHolds(tenantId);
    const date = this.parseDateString(dateStr);

    const [courts, slots] = await Promise.all([
      this.prisma.court.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, slotIntervalMinutes: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.slot.findMany({
        where: { tenantId, date, deletedAt: null },
        orderBy: [{ courtId: 'asc' }, { startTime: 'asc' }],
        include: {
          // Only ACTIVE bookings paint cells. booking_slots rows of
          // cancelled bookings survive (history) but are filtered out here;
          // a slot released by cancel and re-booked carries rows from both
          // bookings, and only the active one matches this filter.
          bookingSlots: {
            where: {
              booking: {
                deletedAt: null,
                status: { in: ACTIVE_BOOKING_STATUSES },
              },
            },
            include: {
              booking: {
                include: {
                  customer: {
                    select: { firstName: true, lastName: true, phone: true },
                  },
                  _count: { select: { bookingSlots: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    // Iterate slots in start-time order per court: the FIRST time a booking
    // is encountered is its chronologically-first slot on the date → isStart.
    const seenBookings = new Set<string>();
    const collectedByBooking = new Map<string, Prisma.Decimal>();
    let bookedSlots = 0;

    const slotDtos: DayViewSlotDto[] = slots.map((slot) => {
      if (slot.status === SlotStatus.Booked) bookedSlots++;

      const link = slot.bookingSlots[0];
      let booking: DayViewSlotDto['booking'];
      if (link) {
        const b = link.booking;
        const isStart = !seenBookings.has(b.id);
        seenBookings.add(b.id);
        if (!collectedByBooking.has(b.id)) {
          collectedByBooking.set(b.id, b.paidAmount);
        }
        booking = {
          id: b.id,
          customerName: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
          customerPhone: b.customer.phone,
          status: b.status,
          paymentStatus: this.derivePaymentStatus(b.paidAmount, b.total),
          total: b.total.toString(),
          paidAmount: b.paidAmount.toString(),
          due: b.total.sub(b.paidAmount).toString(),
          slotCount: b._count.bookingSlots,
          isStart,
        };
      }

      return {
        id: slot.id,
        courtId: slot.courtId,
        startTime: this.formatTimeToHHmm(slot.startTime),
        endTime: this.formatTimeToHHmm(slot.endTime),
        price: slot.price.toString(),
        status: slot.status,
        heldUntil: slot.heldUntil ?? null,
        booking,
      };
    });

    let collected = new Prisma.Decimal(0);
    for (const paid of collectedByBooking.values()) {
      collected = collected.add(paid);
    }

    const totalSlots = slots.length;
    return {
      date: dateStr,
      courts: courts.map((c) => ({
        id: c.id,
        name: c.name,
        slotIntervalMinutes: c.slotIntervalMinutes,
      })),
      slots: slotDtos,
      stats: {
        bookingsCount: collectedByBooking.size,
        totalSlots,
        bookedSlots,
        utilizationPct:
          totalSlots === 0
            ? 0
            : Math.round((bookedSlots / totalSlots) * 1000) / 10,
        collected: collected.toString(),
      },
    };
  }

  // ==========================================================================
  // Lifecycle: cancel
  // ==========================================================================

  async cancel(
    tenantId: string,
    id: string,
    dto: CancelBookingDto,
    actor: BookingActor,
  ): Promise<BookingDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: { bookingSlots: { select: { slotId: true } } },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (
        booking.status !== BookingStatus.Pending &&
        booking.status !== BookingStatus.Confirmed
      ) {
        throw new ConflictException(
          'Only pending or confirmed bookings can be cancelled',
        );
      }

      // --- RACE GATE: conditional on the status we just read ---
      const gate = await tx.booking.updateMany({
        where: { id, tenantId, status: booking.status },
        data: {
          status: BookingStatus.Cancelled,
          cancelledBy: actor.userId,
          cancelledAt: new Date(),
          updatedBy: actor.userId,
        },
      });
      if (gate.count === 0) {
        throw new ConflictException(
          'Booking was modified by someone else — refresh and try again',
        );
      }

      // Release slots conditionally: only Booked → Available. If an admin
      // Blocked a slot mid-flight it stays Blocked (block wins — correct).
      await tx.slot.updateMany({
        where: {
          id: { in: booking.bookingSlots.map((bs) => bs.slotId) },
          tenantId,
          status: SlotStatus.Booked,
        },
        data: { status: SlotStatus.Available },
      });

      // Refund (optional, only when something was paid)
      let refund: { amount: string; method: PaymentMethod } | null = null;
      if (dto.refund) {
        if (booking.paidAmount.lte(0)) {
          throw new BadRequestException('Nothing paid to refund');
        }
        const amount = new Prisma.Decimal(dto.refund.amount);
        if (amount.gt(booking.paidAmount)) {
          throw new BadRequestException('Refund amount exceeds paid amount');
        }
        this.assertMemberContext(actor.memberId);
        const method = dto.refund.method ?? PaymentMethod.Cash;

        await tx.payment.create({
          data: {
            tenantId,
            bookingId: id,
            amount,
            method,
            type: PaymentType.Refund,
            status: PaymentStatus.Refunded,
            issuedBy: actor.memberId,
            paidBy: actor.userId,
          },
        });
        // Conditional on the paidAmount we read — a payment recorded
        // concurrently by another staff member makes this 0 rows.
        const refundGate = await tx.booking.updateMany({
          where: { id, tenantId, paidAmount: booking.paidAmount },
          data: {
            paidAmount: booking.paidAmount.sub(amount),
            updatedBy: actor.userId,
          },
        });
        if (refundGate.count === 0) {
          throw new ConflictException(
            'Booking balance changed — refresh and try again',
          );
        }
        refund = { amount: amount.toString(), method };
      }

      // Reason lives in the event timeline, NOT a booking column —
      // deliberate non-addition (the timeline is the display surface).
      await tx.bookingEvent.create({
        data: {
          tenantId,
          bookingId: id,
          eventType: BookingEventType.Cancelled,
          oldValue: { status: booking.status },
          newValue: { reason: dto.reason, ...(refund ? { refund } : {}) },
          issuedBy: actor.userId,
        },
      });
      await this.createAuditLog(tx, {
        tenantId,
        userId: actor.userId,
        entityType: 'Booking',
        entityId: id,
        action: 'Update',
        newValue: { status: 'Cancelled', reason: dto.reason, refund },
      });
    });

    return this.findOne(tenantId, id);
  }

  // ==========================================================================
  // Lifecycle: confirm / complete / no-show
  // ==========================================================================

  async transitionStatus(
    tenantId: string,
    id: string,
    transition: Transition,
    actor: BookingActor,
  ): Promise<BookingDetailDto> {
    const rule = TRANSITIONS[transition];

    await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id, tenantId, deletedAt: null },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (!rule.from.includes(booking.status)) {
        throw new ConflictException(
          'Booking is not in a state that allows this action',
        );
      }

      // --- RACE GATE: conditional on current status ---
      const gate = await tx.booking.updateMany({
        where: { id, tenantId, status: booking.status },
        data: { status: rule.to, updatedBy: actor.userId },
      });
      if (gate.count === 0) {
        await this.assertBookingExists(tx, id, tenantId);
        throw new ConflictException(
          'Booking is not in a state that allows this action',
        );
      }

      // No slot changes — slots are Booked from creation in the staff flow
      // (incl. NoShow: the slot was consumed, it must not re-open).
      await tx.bookingEvent.create({
        data: {
          tenantId,
          bookingId: id,
          eventType: BookingEventType.StatusChanged,
          oldValue: { status: booking.status },
          newValue: { status: rule.to },
          issuedBy: actor.userId,
        },
      });
      await this.createAuditLog(tx, {
        tenantId,
        userId: actor.userId,
        entityType: 'Booking',
        entityId: id,
        action: 'Update',
        newValue: { action: transition, status: rule.to },
      });
    });

    return this.findOne(tenantId, id);
  }

  // ==========================================================================
  // Payments
  // ==========================================================================

  /**
   * Record a cash payment against a booking. Optimistically gated on the
   * denormalized paidAmount — two staff recording simultaneously: the loser
   * gets 409 "balance changed" and re-reads.
   */
  async recordPayment(
    tenantId: string,
    id: string,
    dto: CreatePaymentDto,
    actor: BookingActor,
  ): Promise<PaymentRecordDto> {
    this.assertMemberContext(actor.memberId);

    const paymentId = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id, tenantId, deletedAt: null },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      const payableStatuses: BookingStatus[] = [
        BookingStatus.Pending,
        BookingStatus.Confirmed,
        BookingStatus.Completed,
      ];
      if (!payableStatuses.includes(booking.status)) {
        throw new ConflictException('Cannot record payment on this booking');
      }

      const due = booking.total.sub(booking.paidAmount);
      const amount = new Prisma.Decimal(dto.amount);
      if (amount.gt(due)) {
        throw new BadRequestException('Amount exceeds remaining due');
      }

      // --- RACE GATE: optimistic on status + paidAmount we just read ---
      const gate = await tx.booking.updateMany({
        where: {
          id,
          tenantId,
          status: booking.status,
          paidAmount: booking.paidAmount,
        },
        data: {
          paidAmount: booking.paidAmount.add(amount),
          updatedBy: actor.userId,
        },
      });
      if (gate.count === 0) {
        throw new ConflictException(
          'Booking balance changed — refresh and try again',
        );
      }

      const type =
        dto.type ?? (amount.gte(due) ? PaymentType.Due : PaymentType.Advance);
      const method = dto.method ?? PaymentMethod.Cash;

      const payment = await tx.payment.create({
        data: {
          tenantId,
          bookingId: id,
          amount,
          method,
          status: PaymentStatus.Paid,
          type,
          referenceNumber: dto.referenceNumber,
          issuedBy: actor.memberId,
          paidBy: actor.userId,
          paidAt: new Date(),
        },
      });

      await tx.bookingEvent.create({
        data: {
          tenantId,
          bookingId: id,
          eventType: BookingEventType.PaymentReceived,
          newValue: {
            amount: amount.toString(),
            method,
            type,
          },
          issuedBy: actor.userId,
        },
      });
      await this.createAuditLog(tx, {
        tenantId,
        userId: actor.userId,
        entityType: 'Payment',
        entityId: payment.id,
        action: 'Create',
        newValue: {
          bookingId: id,
          amount: amount.toString(),
          method,
          type,
        },
      });

      return payment.id;
    });

    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: {
        issuedByMember: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    return this.transformPayment(payment);
  }

  // ==========================================================================
  // Transform helpers (Prisma → wire format)
  // ==========================================================================

  private transformListItem(b: BookingWithList): BookingListItemDto {
    return {
      id: b.id,
      date: this.formatDateToYYYYMMDD(b.date),
      startTime: this.formatTimeToHHmm(b.startTime),
      endTime: this.formatTimeToHHmm(b.endTime),
      courtId: b.courtId,
      courtName: b.court.name,
      customerId: b.customerId,
      customerName: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
      customerPhone: b.customer.phone,
      slotCount: b._count.bookingSlots,
      durationLabel: this.durationLabel(b.startTime, b.endTime),
      status: b.status,
      subTotal: b.subTotal.toString(),
      discount: b.discount.toString(),
      total: b.total.toString(),
      paidAmount: b.paidAmount.toString(),
      due: b.total.sub(b.paidAmount).toString(),
      paymentStatus: this.derivePaymentStatus(b.paidAmount, b.total),
      createdAt: b.createdAt,
    };
  }

  private transformDetail(b: BookingWithDetail): BookingDetailDto {
    const customer: BookingCustomerDto = {
      id: b.customer.id,
      firstName: b.customer.firstName,
      lastName: b.customer.lastName,
      phone: b.customer.phone,
      email: b.customer.email,
    };

    const slots: BookingSlotDto[] = b.bookingSlots.map((bs) => ({
      id: bs.slotId,
      startTime: this.formatTimeToHHmm(bs.slot.startTime),
      endTime: this.formatTimeToHHmm(bs.slot.endTime),
      price: bs.price.toString(),
      status: bs.slot.status,
    }));

    const payments: PaymentRecordDto[] = b.payments.map((p) =>
      this.transformPayment(p),
    );

    const events: BookingEventDto[] = b.bookingEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      createdAt: e.createdAt,
      issuedByName: fullName(e.issuedByUser.firstName, e.issuedByUser.lastName),
      summary: this.eventSummary(e.eventType, e.oldValue, e.newValue),
    }));

    return {
      ...this.transformListItem({
        id: b.id,
        tenantId: b.tenantId,
        courtId: b.courtId,
        customerId: b.customerId,
        status: b.status,
        subTotal: b.subTotal,
        discount: b.discount,
        total: b.total,
        paidAmount: b.paidAmount,
        notes: b.notes,
        createdBy: b.createdBy,
        updatedBy: b.updatedBy,
        deletedBy: b.deletedBy,
        cancelledBy: b.cancelledBy,
        cancelledAt: b.cancelledAt,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        deletedAt: b.deletedAt,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        court: b.court,
        customer: b.customer,
        _count: { bookingSlots: b.bookingSlots.length },
      }),
      notes: b.notes,
      customer,
      slots,
      payments,
      events,
      createdByName: fullName(
        b.createdByUser.firstName,
        b.createdByUser.lastName,
      ),
      cancelledByName: b.cancelledByUser
        ? fullName(b.cancelledByUser.firstName, b.cancelledByUser.lastName)
        : null,
      cancelledAt: b.cancelledAt,
    };
  }

  private transformPayment<
    P extends {
      id: string;
      amount: Prisma.Decimal;
      method: PaymentMethod;
      type: PaymentType;
      status: PaymentStatus;
      referenceNumber: string | null;
      createdAt: Date;
      issuedByMember: {
        user: { firstName: string; lastName: string } | null;
      } | null;
    },
  >(p: P): PaymentRecordDto {
    return {
      id: p.id,
      amount: p.amount.toString(),
      method: p.method,
      type: p.type,
      status: p.status,
      referenceNumber: p.referenceNumber,
      createdAt: p.createdAt,
      issuedByName: p.issuedByMember?.user
        ? fullName(
            p.issuedByMember.user.firstName,
            p.issuedByMember.user.lastName,
          )
        : 'Unknown',
    };
  }

  private derivePaymentStatus(
    paid: Prisma.Decimal,
    total: Prisma.Decimal,
  ): 'Paid' | 'Partial' | 'Unpaid' {
    if (paid.gte(total)) return 'Paid';
    if (paid.gt(0)) return 'Partial';
    return 'Unpaid';
  }

  private durationLabel(start: Date, end: Date): string {
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
  }

  /** One-line human summary for the timeline (defensive on JSON payloads). */
  private eventSummary(
    eventType: BookingEventType,
    oldValue: Prisma.JsonValue,
    newValue: Prisma.JsonValue,
  ): string {
    const oldRec = (oldValue ?? {}) as Record<string, unknown>;
    const newRec = (newValue ?? {}) as Record<string, unknown>;
    switch (eventType) {
      case BookingEventType.Created:
        return 'Booking created';
      case BookingEventType.StatusChanged:
        return `Status: ${String(oldRec.status ?? '—')} → ${String(newRec.status ?? '—')}`;
      case BookingEventType.Cancelled:
        return `Cancelled: ${String(newRec.reason ?? 'no reason given')}`;
      case BookingEventType.PaymentReceived: {
        const method = newRec.method ? ` · ${String(newRec.method)}` : '';
        return `Payment received ৳${String(newRec.amount ?? '?')}${method}`;
      }
      case BookingEventType.Updated:
        return 'Booking updated';
      case BookingEventType.Rescheduled:
        return 'Booking rescheduled';
      default:
        return eventType;
    }
  }

  // ==========================================================================
  // Private helpers (mirrors of slots.service.ts helpers — extraction to
  // common/ is tracked as a separate cleanup task)
  // ==========================================================================

  /** Throw 404 if a tenant-scoped booking does not exist. */
  private async assertBookingExists(
    tx: PrismaTransaction,
    id: string,
    tenantId: string,
  ): Promise<void> {
    const booking = await tx.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
  }

  /**
   * Payment.issuedBy FKs to TenantMember. A superadmin who has NOT selected
   * a tenant carries the virtual 'SUPERADMIN' member id, which would violate
   * that FK — fail early with a clear 400 instead of a 500.
   */
  private assertMemberContext(memberId: string): void {
    if (!memberId || memberId === 'SUPERADMIN') {
      throw new BadRequestException(
        'Select a tenant before recording payments',
      );
    }
  }

  /** Parse YYYY-MM-DD to a UTC-midnight Date (deterministic @db.Date math). */
  private parseDateString(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  /** Format a @db.Date Date as YYYY-MM-DD using UTC getters. */
  private formatDateToYYYYMMDD(date: Date): string {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Format a @db.Time Date as HH:mm using UTC getters. */
  private formatTimeToHHmm(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Write an audit-log row using the provided transaction client.
   * 4th per-service copy (courts, slots, pricing, bookings) — extraction to
   * common/ is a tracked cleanup task, not done here by decision.
   */
  private async createAuditLog(
    tx: PrismaTransaction,
    data: {
      tenantId: string;
      userId: string;
      entityType: string;
      entityId: string;
      action: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
    },
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action as never,
        oldValue: data.oldValue as Prisma.InputJsonValue,
        newValue: data.newValue as Prisma.InputJsonValue,
      },
    });
  }
}

function fullName(firstName: string | null, lastName: string | null): string {
  return `${firstName ?? ''} ${lastName ?? ''}`.trim();
}
