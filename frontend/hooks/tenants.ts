/**
 * Tenant React Query Hooks
 *
 * Custom hooks for tenant operations using TanStack Query
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tenantsApi } from '@/lib/api/tenants'
import type {
  Tenant,
  TenantListResponse,
  TenantListParams,
  TenantMember,
  CreateTenantDto,
  UpdateTenantDto,
} from '@/lib/types/tenant'

/**
 * Query key factory for tenant queries
 */
export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (params: TenantListParams) => [...tenantKeys.lists(), params] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
  members: (id: string) => [...tenantKeys.detail(id), 'members'] as const,
}

/**
 * Hook to fetch paginated list of tenants
 */
export function useTenants(
  params: TenantListParams = {},
  options?: Omit<UseQueryOptions<TenantListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tenantKeys.list(params),
    queryFn: () => tenantsApi.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to fetch a single tenant by ID
 */
export function useTenant(
  id: string,
  options?: Omit<UseQueryOptions<Tenant>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: () => tenantsApi.get(id),
    enabled: !!id,
    ...options,
  })
}

/**
 * Hook to create a new tenant
 */
export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTenantDto) => tenantsApi.create(data),
    onSuccess: (data) => {
      // Invalidate the list query to refetch
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() })
      // Prefetch the new tenant detail
      queryClient.prefetchQuery({
        queryKey: tenantKeys.detail(data.id),
        queryFn: () => tenantsApi.get(data.id),
      })
      toast.success('Turf created successfully', {
        description: `"${data.name}" is now ready for setup`,
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to create turf', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to update a tenant
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantDto }) =>
      tenantsApi.update(id, data),
    onSuccess: (data) => {
      // Update the detail cache
      queryClient.setQueryData(tenantKeys.detail(data.id), data)
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() })
      toast.success('Turf updated successfully', {
        description: `"${data.name}" has been updated`,
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to update turf', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to delete a tenant
 */
export function useDeleteTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => tenantsApi.delete(id),
    onSuccess: () => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() })
      toast.success('Turf deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete turf', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to fetch tenant members
 */
export function useTenantMembers(
  tenantId: string,
  options?: Omit<UseQueryOptions<TenantMember[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tenantKeys.members(tenantId),
    queryFn: () => tenantsApi.getMembers(tenantId),
    enabled: !!tenantId,
    ...options,
  })
}
