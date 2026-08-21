/**
 * Court Types
 *
 * Type definitions for court management
 */

/**
 * Court status enum
 */
export type CourtStatus = 'Available' | 'Maintenance' | 'Inactive'

/**
 * Full court response
 */
export interface Court {
  id: string
  name: string
  description: string | null
  status: CourtStatus
  slotIntervalMinutes: number
  openingTime: string | null
  closingTime: string | null
  tenantId: string
  createdBy: string
  updatedBy: string | null
  deletedBy: string | null
  pricingRuleCount: number
  slotCount: number
  bookingCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/**
 * Slot intervals (minutes) a court can be configured with
 */
export const ALLOWED_SLOT_INTERVALS = [30, 45, 60, 90, 120] as const

/**
 * Create court DTO
 */
export interface CreateCourtDto {
  name: string
  description?: string
  status?: CourtStatus
  slotIntervalMinutes?: number
  openingTime?: string
  closingTime?: string
}

/**
 * Update court DTO
 */
export interface UpdateCourtDto {
  name?: string
  description?: string
  status?: CourtStatus
  slotIntervalMinutes?: number
  openingTime?: string
  closingTime?: string
}

/**
 * Paginated court list response
 * Matches backend format: { data, total, page, limit, totalPages }
 */
export interface CourtListResponse {
  data: Court[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * List query parameters for courts
 */
export interface CourtListParams {
  page?: number
  limit?: number
  status?: CourtStatus
  search?: string
  includeDeleted?: boolean
}
