/**
 * Bookings API client
 */

import { apiClient } from "./api-client";
import type {
  BookingDetail,
  BookingListResponse,
  CancelBookingDto,
  CreateBookingDto,
  DayViewResponse,
  PaymentRecord,
  QueryBookingsParams,
  RecordPaymentDto,
} from "@/lib/types/booking";

/**
 * Bookings API endpoints
 */
export const bookingsApi = {
  /**
   * List bookings with optional filtering and pagination
   */
  list: (params?: QueryBookingsParams) =>
    apiClient.get<BookingListResponse>("/bookings", { params }),

  /**
   * Get a single booking by ID (slots, payments, event timeline)
   */
  get: (id: string) => apiClient.get<BookingDetail>(`/bookings/${id}`),

  /**
   * Calendar grid payload: ALL slots of ALL tenant courts for one date,
   * with active bookings attached
   */
  dayView: (date: string) =>
    apiClient.get<DayViewResponse>("/bookings/day-view", {
      params: { date },
    }),

  /**
   * Create a booking — books all slots Available → Booked atomically;
   * the race loser gets a 409
   */
  create: (data: CreateBookingDto) =>
    apiClient.post<BookingDetail>("/bookings", data),

  /**
   * Confirm a Pending booking
   */
  confirm: (id: string) =>
    apiClient.post<BookingDetail>(`/bookings/${id}/confirm`),

  /**
   * Mark a Confirmed booking Completed (after the session)
   */
  complete: (id: string) =>
    apiClient.post<BookingDetail>(`/bookings/${id}/complete`),

  /**
   * Mark a Confirmed booking NoShow
   */
  noShow: (id: string) =>
    apiClient.post<BookingDetail>(`/bookings/${id}/no-show`),

  /**
   * Cancel a booking (reason stored on the Cancelled event; optional refund)
   */
  cancel: (id: string, data: CancelBookingDto) =>
    apiClient.post<BookingDetail>(`/bookings/${id}/cancel`, data),

  /**
   * Record a manual payment against a booking
   */
  recordPayment: (id: string, data: RecordPaymentDto) =>
    apiClient.post<PaymentRecord>(`/bookings/${id}/payments`, data),
};
