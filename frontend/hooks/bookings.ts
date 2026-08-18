/**
 * React Query hooks for Bookings
 *
 * Cache invalidation lives here; success/error toasts are handled in the
 * components via the `mutate(..., { onSuccess, onError })` callbacks (same
 * convention as hooks/slots.ts).
 *
 * Booking mutations deliberately cross-invalidate `slotKeys.lists()` — they
 * change slot statuses (Available → Booked / back) that the Slots page shows.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingsApi } from "@/lib/api/bookings";
import { slotKeys } from "./slots";
import type {
  CancelBookingDto,
  CreateBookingDto,
  QueryBookingsParams,
  RecordPaymentDto,
} from "@/lib/types/booking";

/**
 * Query key factory for bookings
 */
export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (params?: QueryBookingsParams) => [...bookingKeys.lists(), params] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
  dayViews: () => [...bookingKeys.all, "day-view"] as const,
  dayView: (date: string) => [...bookingKeys.dayViews(), date] as const,
};

/**
 * THE freshness override point: the day-view calendar is shared live by
 * multiple staff, so it polls (60s), goes stale fast (30s), and refetches on
 * window focus — unlike the app-wide 5min/no-focus defaults.
 */
export function useDayView(date: string) {
  return useQuery({
    queryKey: bookingKeys.dayView(date),
    queryFn: () => bookingsApi.dayView(date),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 60 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch bookings with optional filtering and pagination
 */
export function useBookings(params?: QueryBookingsParams) {
  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => bookingsApi.list(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch a single booking by ID (detail sheet payload)
 */
export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingsApi.get(id),
    enabled: !!id,
  });
}

/**
 * Create a booking — slots go Available → Booked
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingDto) => bookingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.dayViews() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

/**
 * Confirm a Pending booking
 */
export function useConfirmBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingsApi.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.dayViews() });
    },
  });
}

/**
 * Mark a Confirmed booking Completed
 */
export function useCompleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingsApi.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.dayViews() });
    },
  });
}

/**
 * Mark a Confirmed booking NoShow
 */
export function useNoShowBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingsApi.noShow(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.dayViews() });
    },
  });
}

/**
 * Cancel a booking — its slots are released back to Available, so the Slots
 * list is invalidated alongside the booking caches
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelBookingDto }) =>
      bookingsApi.cancel(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.dayViews() });
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

/**
 * Record a manual payment against a booking
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecordPaymentDto }) =>
      bookingsApi.recordPayment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.dayViews() });
    },
  });
}
