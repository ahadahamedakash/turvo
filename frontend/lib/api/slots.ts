/**
 * Slots API client
 */

import { apiClient } from "./api-client";
import type {
  Slot,
  GenerateSlotsDto,
  SlotGenerationResult,
  BlockSlotDto,
  SlotListResponse,
  QuerySlotsParams,
  CleanupSlotsResult,
  SlotSettings,
  UpdateSlotSettingsDto,
  Holiday,
  CreateHolidayDto,
} from "@/lib/types/slot";

/**
 * Slots API endpoints
 */
export const slotsApi = {
  /**
   * List slots with optional filtering and pagination
   */
  list: (params?: QuerySlotsParams) =>
    apiClient.get<SlotListResponse>("/slots", { params }),

  /**
   * Get a single slot by ID
   */
  get: (id: string) => apiClient.get<Slot>(`/slots/${id}`),

  /**
   * Generate slots from pricing rules for a court (or all courts when
   * courtId is omitted) + date range
   */
  generate: (data: GenerateSlotsDto) =>
    apiClient.post<SlotGenerationResult>("/slots/generate", data),

  /**
   * Get tenant slot-generation settings (weekend days, timezone, auto-gen)
   */
  getSettings: () => apiClient.get<SlotSettings>("/slots/settings"),

  /**
   * Update tenant slot-generation settings
   */
  updateSettings: (data: UpdateSlotSettingsDto) =>
    apiClient.put<SlotSettings>("/slots/settings", data),

  /**
   * List the tenant's holiday calendar
   */
  listHolidays: () => apiClient.get<Holiday[]>("/slots/holidays"),

  /**
   * Mark a date as a holiday
   */
  addHoliday: (data: CreateHolidayDto) =>
    apiClient.post<Holiday>("/slots/holidays", data),

  /**
   * Remove a holiday
   */
  removeHoliday: (id: string) =>
    apiClient.delete<{ message: string }>(`/slots/holidays/${id}`),

  /**
   * Hold a slot temporarily during checkout
   */
  hold: (id: string) => apiClient.post<Slot>(`/slots/${id}/hold`),

  /**
   * Release a held slot
   */
  release: (id: string) => apiClient.post<Slot>(`/slots/${id}/release`),

  /**
   * Block a slot (maintenance, private events)
   */
  block: (id: string, data: BlockSlotDto) =>
    apiClient.post<Slot>(`/slots/${id}/block`, data),

  /**
   * Unblock a slot
   */
  unblock: (id: string) => apiClient.post<Slot>(`/slots/${id}/unblock`),

  /**
   * Hard-delete stale slots before a given date
   */
  cleanup: (beforeDate: string) =>
    apiClient.delete<CleanupSlotsResult>("/slots/cleanup", {
      params: { beforeDate },
    }),
};
