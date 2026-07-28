/**
 * Invitation React Query Hooks
 *
 * Custom hooks for invitation operations using TanStack Query
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invitationsApi } from '@/lib/api/invitations'
import type { Invitation, CreateInvitationDto, InvitationListResponse } from '@/lib/types/invitation'

/**
 * Query key factory for invitation queries
 */
export const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
  list: (tenantId: string, params?: any) => [...invitationKeys.lists(), tenantId, params] as const,
  details: () => [...invitationKeys.all, 'detail'] as const,
  detail: (id: string) => [...invitationKeys.details(), id] as const,
}

/**
 * Hook to fetch invitations for a tenant
 */
export function useInvitations(
  tenantId: string,
  params?: { status?: string; page?: number; limit?: number },
  options?: Omit<UseQueryOptions<InvitationListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: invitationKeys.list(tenantId, params),
    queryFn: () => invitationsApi.list(tenantId, params),
    enabled: !!tenantId,
    ...options,
  })
}

/**
 * Hook to create a new invitation
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateInvitationDto) => invitationsApi.create(data),
    onSuccess: (data) => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() })
      toast.success('Invitation sent successfully', {
        description: `Invitation sent to ${data.email}`,
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to send invitation', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to revoke an invitation
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => invitationsApi.revoke(id),
    onSuccess: () => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() })
      toast.success('Invitation revoked')
    },
    onError: (error: Error) => {
      toast.error('Failed to revoke invitation', {
        description: error.message,
      })
    },
  })
}
