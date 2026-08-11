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
 * Create court DTO
 */
export interface CreateCourtDto {
  name: string
  description?: string
  status?: CourtStatus
}

/**
 * Update court DTO
 */
export interface UpdateCourtDto {
  name?: string
  description?: string
  status?: CourtStatus
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
