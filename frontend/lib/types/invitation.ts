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
 * Inviter information (could be tenant member or superadmin user)
 */
export interface InviterMember {
  id: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface InviterUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

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
  // Dual FK fields - exactly one will be set
  invitedByMemberId?: string | null
  invitedByUserId?: string | null
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
  // Populated relations
  invitedByMember?: InviterMember
  invitedByUser?: InviterUser
  acceptedByUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  revokedByMember?: InviterMember
}

/**
 * Helper to get inviter name from invitation
 */
export function getInviterName(invitation: Invitation): string {
  if (invitation.invitedByMember?.user) {
    const { firstName, lastName } = invitation.invitedByMember.user
    return `${firstName} ${lastName}`
  }
  if (invitation.invitedByUser) {
    const { firstName, lastName } = invitation.invitedByUser
    return `${firstName} ${lastName}`
  }
  return 'Unknown'
}

/**
 * Helper to check if invitation was created by superadmin
 */
export function isInvitedBySuperadmin(invitation: Invitation): boolean {
  return !!invitation.invitedByUserId
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
 * Matches backend format: { data, total, page, limit, totalPages }
 */
export interface InvitationListResponse {
  data: Invitation[]
  total: number
  page: number
  limit: number
  totalPages: number
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

/**
 * Verify invitation request
 */
export interface VerifyInvitationDto {
  token: string
}

/**
 * Verified invitation details
 */
export interface VerifiedInvitation {
  id: string
  email: string
  tenantId: string
  tenantName: string
  roleId: string
  roleName: string
  expiresAt: string
  status: InvitationStatus
}

/**
 * Accept invitation request
 */
export interface AcceptInvitationDto {
  token: string
  password?: string
  firstName?: string
  lastName?: string
  phone?: string
  gender?: 'Male' | 'Female' | 'Other'
}

/**
 * Accept invitation response
 */
export interface AcceptInvitationResponse {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
  tenantMember: {
    id: string
    tenantId: string
  }
  accessToken: string
  refreshToken: string
}
