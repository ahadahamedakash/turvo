/**
 * Invitation API Client
 *
 * API methods for invitation management
 */

import { apiClient } from '@/lib/api'
import type {
  CreateInvitationDto,
  Invitation,
  InvitationListResponse,
  InvitationListParams,
  VerifyInvitationDto,
  VerifiedInvitation,
  AcceptInvitationDto,
  AcceptInvitationResponse,
} from '@/lib/types/invitation'

/**
 * Invitation API endpoints
 */
export const invitationsApi = {
  /**
   * List invitations (supports both tenant-scoped and superadmin views)
   * For superadmins: all invitations across all tenants
   * For tenant members: only invitations for their tenant
   */
  list: async (params?: InvitationListParams): Promise<InvitationListResponse> => {
    // Build query string
    const queryParams = new URLSearchParams()
    queryParams.append('page', String(params?.page || 1))
    queryParams.append('limit', String(params?.limit || 10))
    if (params?.status && params.status !== 'All') {
      queryParams.append('status', params.status)
    }
    if (params?.search) {
      queryParams.append('search', params.search)
    }
    if (params?.tenantId) {
      queryParams.append('tenantId', params.tenantId)
    }

    const queryString = queryParams.toString()
    const url = `/invitations${queryString ? `?${queryString}` : ''}`

    return apiClient.get<InvitationListResponse>(url)
  },

  /**
   * Get a single invitation by ID
   */
  get: async (id: string): Promise<Invitation> => {
    return apiClient.get<Invitation>(`/invitations/${id}`)
  },

  /**
   * Create a new invitation
   */
  create: async (data: CreateInvitationDto): Promise<Invitation> => {
    return apiClient.post<Invitation>('/invitations', data)
  },

  /**
   * Verify an invitation token (public endpoint)
   */
  verify: async (dto: VerifyInvitationDto): Promise<VerifiedInvitation> => {
    return apiClient.post<VerifiedInvitation>('/invitations/verify', dto)
  },

  /**
   * Accept an invitation (public endpoint)
   */
  accept: async (dto: AcceptInvitationDto): Promise<AcceptInvitationResponse> => {
    return apiClient.post<AcceptInvitationResponse>('/invitations/accept', dto)
  },

  /**
   * Revoke an invitation
   */
  revoke: async (id: string): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>(`/invitations/${id}/revoke`)
  },

  /**
   * Delete an invitation (superadmin only)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/invitations/${id}`)
  },
}
