/**
 * Court API Client
 *
 * API methods for court management
 */

import { apiClient } from '@/lib/api'
import type {
  CreateCourtDto,
  Court,
  CourtListResponse,
  CourtListParams,
  UpdateCourtDto,
} from '@/lib/types/court'

/**
 * Court API endpoints
 */
export const courtsApi = {
  /**
   * List courts (tenant-scoped)
   */
  list: async (params?: CourtListParams): Promise<CourtListResponse> => {
    // Build query string
    const queryParams = new URLSearchParams()
    queryParams.append('page', String(params?.page || 1))
    queryParams.append('limit', String(params?.limit || 10))
    if (params?.status) {
      queryParams.append('status', params.status)
    }
    if (params?.search) {
      queryParams.append('search', params.search)
    }
    if (params?.includeDeleted) {
      queryParams.append('includeDeleted', 'true')
    }

    const queryString = queryParams.toString()
    const url = `/courts${queryString ? `?${queryString}` : ''}`

    return apiClient.get<CourtListResponse>(url)
  },

  /**
   * Get a single court by ID
   */
  get: async (id: string): Promise<Court> => {
    return apiClient.get<Court>(`/courts/${id}`)
  },

  /**
   * Create a new court
   */
  create: async (data: CreateCourtDto): Promise<Court> => {
    return apiClient.post<Court>('/courts', data)
  },

  /**
   * Update a court
   */
  update: async (id: string, data: UpdateCourtDto): Promise<Court> => {
    return apiClient.put<Court>(`/courts/${id}`, data)
  },

  /**
   * Delete a court (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/courts/${id}`)
  },

  /**
   * Restore a soft deleted court
   */
  restore: async (id: string): Promise<Court> => {
    return apiClient.post<Court>(`/courts/${id}/restore`, {})
  },
}
