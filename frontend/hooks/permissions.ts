/**
 * Permissions React Query Hooks
 *
 * Custom hooks for permission operations using TanStack Query
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { permissionsApi } from '@/lib/api/permissions'
import type {
  Permission,
  RoleWithPermissions,
  UserRoleAssignment,
  MemberPermissions,
  UpdateRolePermissionsDto,
  UpdateMemberRolesDto,
} from '@/lib/types/permission'

/**
 * Query key factory for permissions queries
 */
export const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: () => [...permissionKeys.lists()] as const,
  roles: () => [...permissionKeys.all, 'roles'] as const,
  role: (id: string) => [...permissionKeys.roles(), id] as const,
  members: () => [...permissionKeys.all, 'members'] as const,
  memberRoles: (id: string) => [...permissionKeys.members(), 'roles', id] as const,
  memberPermissions: (id: string) => [...permissionKeys.members(), 'permissions', id] as const,
}

/**
 * Hook to fetch all permissions
 */
export function usePermissions(
  options?: Omit<UseQueryOptions<Permission[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: permissionKeys.list(),
    queryFn: () => permissionsApi.getAll(),
    staleTime: 10 * 60 * 1000, // 10 minutes - permissions rarely change
    ...options,
  })
}

/**
 * Hook to fetch role permissions
 */
export function useRolePermissions(
  roleId: string,
  options?: Omit<UseQueryOptions<RoleWithPermissions>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: permissionKeys.role(roleId),
    queryFn: () => permissionsApi.getRolePermissions(roleId),
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to fetch member roles
 */
export function useMemberRoles(
  tenantMemberId: string,
  options?: Omit<UseQueryOptions<UserRoleAssignment[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: permissionKeys.memberRoles(tenantMemberId),
    queryFn: () => permissionsApi.getMemberRoles(tenantMemberId),
    enabled: !!tenantMemberId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  })
}

/**
 * Hook to fetch member permissions
 */
export function useMemberPermissions(
  tenantMemberId: string,
  options?: Omit<UseQueryOptions<MemberPermissions>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: permissionKeys.memberPermissions(tenantMemberId),
    queryFn: () => permissionsApi.getMemberPermissions(tenantMemberId),
    enabled: !!tenantMemberId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  })
}

/**
 * Hook to update role permissions
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: UpdateRolePermissionsDto }) =>
      permissionsApi.updateRolePermissions(roleId, data),
    onSuccess: (data, variables) => {
      // Invalidate the specific role query
      queryClient.invalidateQueries({ queryKey: permissionKeys.role(variables.roleId) })
      // Invalidate all permissions queries
      queryClient.invalidateQueries({ queryKey: permissionKeys.all })
      toast.success('Role permissions updated', {
        description: `"${data.name}" permissions have been updated`,
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to update role permissions', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to update member roles
 */
export function useUpdateMemberRoles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tenantMemberId, data }: { tenantMemberId: string; data: UpdateMemberRolesDto }) =>
      permissionsApi.updateMemberRoles(tenantMemberId, data),
    onSuccess: (data, variables) => {
      // Invalidate the specific member queries
      queryClient.invalidateQueries({ queryKey: permissionKeys.memberRoles(variables.tenantMemberId) })
      queryClient.invalidateQueries({ queryKey: permissionKeys.memberPermissions(variables.tenantMemberId) })
      // Invalidate tenant members list
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Member roles updated', {
        description: 'User roles have been updated successfully',
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to update member roles', {
        description: error.message,
      })
    },
  })
}
