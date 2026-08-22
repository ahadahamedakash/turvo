/**
 * Booking type definitions
 *
 * Mirrors the backend bookings DTOs (`modules/bookings/dto/`). Money is
 * typed as `string` because the backend serializes Prisma `Decimal` columns
 * to JSON strings (e.g. "500.00") — format with `Number(value)` before
 * rendering. Dates are YYYY-MM-DD, times HH:mm.
 */

import type {
  BookingEventType,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SlotStatus,
} from "./enums";

/**
 * Derived payment state shown in lists/grids — computed server-side from
 * paidAmount vs total (Paid / Partial / Unpaid). Distinct from the
 * per-payment `PaymentStatus` lifecycle enum.
 */
export type BookingPaymentStatus = "Paid" | "Partial" | "Unpaid";

/**
 * Payment collection mode for booking creation
 */
export enum PaymentMode {
  NONE = "none",
  BOOKING = "booking",
  FULL = "full",
  CUSTOM = "custom",
}

// ---------------------------------------------------------------------------
// Create / query payloads
// ---------------------------------------------------------------------------

/**
 * Customer block of a create-booking payload. Resolution order server-side:
 * customerId (typeahead pick) → phone → email → create new row.
 */
export interface CustomerInfo {
  customerId?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

/** Optional cash collection recorded at booking creation */
export interface CreatePaymentInfo {
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  type?: PaymentType;
}

export interface CreateBookingDto {
  /** Consecutive slots, same court, same date — 1..8 slot IDs */
  slotIds: string[];
  customer: CustomerInfo;
  /** "Pending" saves a tentative booking; default is "Confirmed" */
  status?: "Pending" | "Confirmed";
  discount?: number;
  notes?: string;
  /** Payment collection mode */
  paymentMode?: PaymentMode;
  payment?: CreatePaymentInfo;
}

/** Body of POST /bookings/:id/payments */
export interface RecordPaymentDto {
  amount: number;
  method?: PaymentMethod;
  referenceNumber?: string;
}

/** Body of POST /bookings/:id/cancel */
export interface CancelBookingDto {
  reason: string;
  refund?: {
    amount: number;
    method?: PaymentMethod;
  };
}

export interface QueryBookingsParams {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  courtId?: string;
  status?: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
  /** Free text — matches customer name or phone (contains) */
  customer?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export interface BookingListItem {
  id: string;
  date: string; // YYYY-MM-DD (first slot)
  startTime: string; // HH:mm (first slot)
  endTime: string; // HH:mm (last slot end)
  courtId: string;
  courtName: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  slotCount: number;
  durationLabel: string; // e.g. "2h"
  status: BookingStatus;
  subTotal: string; // Decimal as string
  discount: string;
  total: string;
  paidAmount: string;
  due: string;
  paymentStatus: BookingPaymentStatus;
  createdAt: string;
}

export interface BookingListResponse {
  data: BookingListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BookingCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

export interface BookingSlot {
  id: string;
  startTime: string;
  endTime: string;
  price: string; // Price snapshotted at booking time
  status: SlotStatus;
}

export interface PaymentRecord {
  id: string;
  amount: string; // Decimal as string
  method: PaymentMethod;
  type: PaymentType;
  status: PaymentStatus;
  referenceNumber?: string | null;
  createdAt: string;
  issuedByName: string;
}

export interface BookingEventRecord {
  id: string;
  eventType: BookingEventType;
  createdAt: string;
  issuedByName: string;
  /** One-line human summary for the timeline */
  summary: string;
}

export interface BookingDetail extends BookingListItem {
  notes?: string | null;
  customer: BookingCustomer;
  /** Ordered by start time */
  slots: BookingSlot[];
  /** Ordered oldest first */
  payments: PaymentRecord[];
  /** Ordered newest first */
  events: BookingEventRecord[];
  createdByName: string;
  cancelledByName?: string | null;
  cancelledAt?: string | null;
}

// ---------------------------------------------------------------------------
// Day view (calendar grid payload)
// ---------------------------------------------------------------------------

export interface DayViewCourt {
  id: string;
  name: string;
  slotIntervalMinutes: number;
}

export interface DayViewBooking {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  total: string;
  paidAmount: string;
  due: string;
  slotCount: number;
  /**
   * true only on the booking's first (label) slot — continuation slots repeat
   * the booking with isStart false so the grid can occupy cells.
   */
  isStart: boolean;
}

export interface DayViewSlot {
  id: string;
  courtId: string;
  startTime: string;
  endTime: string;
  price: string;
  status: SlotStatus;
  /** Present while Held */
  heldUntil?: string | null;
  /** Attached active booking (absent on available/blocked cells) */
  booking?: DayViewBooking;
}

export interface DayViewStats {
  bookingsCount: number;
  totalSlots: number;
  bookedSlots: number;
  /** bookedSlots / totalSlots × 100 */
  utilizationPct: number;
  collected: string;
}

export interface DayViewResponse {
  date: string; // YYYY-MM-DD
  courts: DayViewCourt[];
  slots: DayViewSlot[];
  stats: DayViewStats;
}
