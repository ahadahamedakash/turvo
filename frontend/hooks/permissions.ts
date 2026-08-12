/**
 * Permissions React Query Hooks
 *
 * Custom hooks for permission operations using TanStack Query
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { permissionsApi } from '@/lib/api/permissions';
import type {
  Permission,
  RoleWithPermissions,
  UserRoleAssignment,
  MemberPermissions,
  UpdateRolePermissionsDto,
  UpdateMemberRolesDto,
} from '@/lib/types/permission';
import type { CreatePermissionInput, UpdatePermissionInput } from '@/lib/schemas/permission';

/**
 * Query key factory for permissions queries
 */
export const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: () => [...permissionKeys.lists()] as const,
  detail: (id: string) => [...permissionKeys.all, 'detail', id] as const,
  roles: () => [...permissionKeys.all, 'roles'] as const,
  role: (id: string) => [...permissionKeys.roles(), id] as const,
  members: () => [...permissionKeys.all, 'members'] as const,
  memberRoles: (id: string) => [...permissionKeys.members(), 'roles', id] as const,
  memberPermissions: (id: string) => [...permissionKeys.members(), 'permissions', id] as const,
};

/**
 * Hook to fetch all permissions
 */
export function usePermissions(
  options?: Omit<UseQueryOptions<Permission[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: permissionKeys.list(),
    queryFn: () => permissionsApi.getAll(),
    staleTime: 10 * 60 * 1000, // 10 minutes - permissions rarely change
    ...options,
  });
}

/**
 * Hook to fetch a single permission
 */
export function usePermission(
  id: string,
  options?: Omit<UseQueryOptions<Permission>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: permissionKeys.detail(id),
    queryFn: () => permissionsApi.get(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to create a new permission
 */
export function useCreatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePermissionInput) => permissionsApi.create(data),
    onSuccess: (data) => {
      // Invalidate permissions list query
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
      toast.success('Permission created', {
        description: `"${data.name}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create permission', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to update an existing permission
 */
export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePermissionInput }) =>
      permissionsApi.update(id, data),
    onSuccess: (data) => {
      // Invalidate the specific permission query
      queryClient.invalidateQueries({ queryKey: permissionKeys.detail(data.id) });
      // Invalidate all permissions queries
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
      toast.success('Permission updated', {
        description: `"${data.name}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update permission', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to delete a permission
 */
export function useDeletePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => permissionsApi.delete(id),
    onSuccess: () => {
      // Invalidate all permissions queries
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
      toast.success('Permission deleted', {
        description: 'The permission has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      // Handle conflict error (permission assigned to roles)
      if (error.message.includes('assigned to')) {
        toast.error('Cannot delete permission', {
          description: error.message,
        });
      } else {
        toast.error('Failed to delete permission', {
          description: error.message,
        });
      }
    },
  });
}

/**
 * Hook to fetch role permissions
 */
export function useRolePermissions(
  roleId: string,
  options?: Omit<UseQueryOptions<RoleWithPermissions>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: permissionKeys.role(roleId),
    queryFn: () => permissionsApi.getRolePermissions(roleId),
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch member roles
 */
export function useMemberRoles(
  tenantMemberId: string,
  options?: Omit<UseQueryOptions<UserRoleAssignment[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: permissionKeys.memberRoles(tenantMemberId),
    queryFn: () => permissionsApi.getMemberRoles(tenantMemberId),
    enabled: !!tenantMemberId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Hook to fetch member permissions
 */
export function useMemberPermissions(
  tenantMemberId: string,
  options?: Omit<UseQueryOptions<MemberPermissions>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: permissionKeys.memberPermissions(tenantMemberId),
    queryFn: () => permissionsApi.getMemberPermissions(tenantMemberId),
    enabled: !!tenantMemberId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Hook to update role permissions
 * Implements optimistic updates with automatic rollback on error
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: UpdateRolePermissionsDto }) =>
      permissionsApi.updateRolePermissions(roleId, data),

    // Optimistic update - update cache immediately with new data
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: permissionKeys.role(variables.roleId) });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueryData<RoleWithPermissions>(
        permissionKeys.role(variables.roleId),
      );

      // Get all permissions for building optimistic response
      const allPermissions = queryClient.getQueryData<Permission[]>(
        permissionKeys.list(),
      );

      // Optimistically update to the new value
      if (previousData && allPermissions) {
        queryClient.setQueryData<RoleWithPermissions>(
          permissionKeys.role(variables.roleId),
          {
            ...previousData,
            permissions: variables.data.permissionIds
              .map((id) => allPermissions.find((p) => p.id === id))
              .filter((p): p is Permission => p !== undefined),
          },
        );
      }

      return { previousData };
    },

    // If mutation fails, use context returned from onMutate to roll back
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          permissionKeys.role(variables.roleId),
          context.previousData,
        );
      }
      toast.error('Failed to update role permissions', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    },

    // Always refetch after success or error to ensure consistency
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.role(variables.roleId) });
    },

    onSuccess: (data, variables) => {
      // Invalidate all permissions queries to keep lists in sync
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
      toast.success('Role permissions updated', {
        description: `"${data.name}" permissions have been updated`,
      });
    },
  });
}

/**
 * Hook to update member roles
 */
export function useUpdateMemberRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantMemberId, data }: { tenantMemberId: string; data: UpdateMemberRolesDto }) =>
      permissionsApi.updateMemberRoles(tenantMemberId, data),
    onSuccess: (data, variables) => {
      // Invalidate the specific member queries
      queryClient.invalidateQueries({ queryKey: permissionKeys.memberRoles(variables.tenantMemberId) });
      queryClient.invalidateQueries({ queryKey: permissionKeys.memberPermissions(variables.tenantMemberId) });
      // Invalidate tenant members list
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Member roles updated', {
        description: 'User roles have been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update member roles', {
        description: error.message,
      });
    },
  });
}
