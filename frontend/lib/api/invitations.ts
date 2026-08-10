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
   * List invitations for a tenant
   */
  list: async (tenantId: string, params?: { status?: string; page?: number; limit?: number }): Promise<InvitationListResponse> => {
    // Build query string
    const queryParams = new URLSearchParams()
    queryParams.append('tenantId', tenantId)
    if (params?.status) {
      queryParams.append('status', params.status)
    }
    queryParams.append('page', String(params?.page || 1))
    queryParams.append('limit', String(params?.limit || 10))

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
}
