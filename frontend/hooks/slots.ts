/**
 * React Query hooks for Slots
 *
 * Cache invalidation lives here; success/error toasts are handled in the
 * components via the `mutate(..., { onSuccess, onError })` callbacks so that
 * messages can be context-specific (e.g. the generate result count).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { slotsApi } from "@/lib/api/slots";
import type {
  GenerateSlotsDto,
  BlockSlotDto,
  QuerySlotsParams,
  UpdateSlotSettingsDto,
  CreateHolidayDto,
} from "@/lib/types/slot";

/**
 * Query key factory for slots
 */
export const slotKeys = {
  all: ["slots"] as const,
  lists: () => [...slotKeys.all, "list"] as const,
  list: (params?: QuerySlotsParams) => [...slotKeys.lists(), params] as const,
  detail: (id: string) => [...slotKeys.all, "detail", id] as const,
  settings: () => [...slotKeys.all, "settings"] as const,
  holidays: () => [...slotKeys.all, "holidays"] as const,
};

/**
 * Fetch slots with optional filtering and pagination.
 * Short stale time because slot availability changes frequently.
 */
export function useSlots(params?: QuerySlotsParams) {
  return useQuery({
    queryKey: slotKeys.list(params),
    queryFn: () => slotsApi.list(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch a single slot by ID
 */
export function useSlot(id: string) {
  return useQuery({
    queryKey: slotKeys.detail(id),
    queryFn: () => slotsApi.get(id),
    enabled: !!id,
  });
}

/**
 * Generate slots from pricing rules
 */
export function useGenerateSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateSlotsDto) => slotsApi.generate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

/**
 * Hold a slot (during checkout)
 */
export function useHoldSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => slotsApi.hold(slotId),
    onSuccess: (_, slotId) => {
      queryClient.invalidateQueries({ queryKey: slotKeys.detail(slotId) });
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

/**
 * Release a held slot
 */
export function useReleaseSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => slotsApi.release(slotId),
    onSuccess: (_, slotId) => {
      queryClient.invalidateQueries({ queryKey: slotKeys.detail(slotId) });
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

/**
 * Block a slot (maintenance, events)
 */
export function useBlockSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slotId, data }: { slotId: string; data: BlockSlotDto }) =>
      slotsApi.block(slotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

/**
 * Unblock a slot
 */
export function useUnblockSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => slotsApi.unblock(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

/**
 * Cleanup (hard-delete) stale slots before a date
 */
export function useCleanupSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (beforeDate: string) => slotsApi.cleanup(beforeDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

/**
 * Get tenant slot-generation settings
 */
export function useSlotSettings() {
  return useQuery({
    queryKey: slotKeys.settings(),
    queryFn: () => slotsApi.getSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update tenant slot-generation settings
 */
export function useUpdateSlotSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSlotSettingsDto) => slotsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.settings() });
    },
  });
}

/**
 * List the tenant's holiday calendar
 */
export function useHolidays() {
  return useQuery({
    queryKey: slotKeys.holidays(),
    queryFn: () => slotsApi.listHolidays(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mark a date as a holiday
 */
export function useAddHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHolidayDto) => slotsApi.addHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.holidays() });
    },
  });
}

/**
 * Remove a holiday
 */
export function useRemoveHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => slotsApi.removeHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.holidays() });
    },
  });
}
