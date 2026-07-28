/**
 * Invitation Types
 *
 * Type definitions for invitation management
 */

/**
 * Invitation status enum
 */
export type InvitationStatus = 'Pending' | 'Accepted' | 'Revoked' | 'Expired'

/**
 * Full invitation response
 */
export interface Invitation {
  id: string
  email: string
  tenantId: string
  roleId: string
  token: string
  status: InvitationStatus
  expiresAt: string
  revokedAt?: string | null
  acceptedAt?: string | null
  acceptedBy?: string | null
  invitedBy: string // tenantMemberId
  revokedBy?: string | null
  createdAt: string
  updatedAt: string
  tenant?: {
    id: string
    name: string
  }
  role?: {
    id: string
    name: string
    slug: string
  }
}

/**
 * Create invitation DTO
 */
export interface CreateInvitationDto {
  email: string
  roleId: string
  tenantId?: string
  expiresInDays?: number
}

/**
 * Paginated invitation list response
 */
export interface InvitationListResponse {
  data: Invitation[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Role for invitation assignment
 */
export interface Role {
  id: string
  name: string
  slug: string
  description?: string | null
}
