/**
 * Roles React Query Hooks
 *
 * Custom hooks for fetching roles using TanStack Query
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { rolesApi } from '@/lib/api/roles'
import type { Role } from '@/lib/types/role'

/**
 * Query key factory for role queries
 */
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
}

/**
 * Hook to fetch all available roles
 */
export function useRoles(options?: Omit<UseQueryOptions<Role[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: () => rolesApi.getAll(),
    staleTime: 10 * 60 * 1000, // 10 minutes - roles rarely change
    ...options,
  })
}
